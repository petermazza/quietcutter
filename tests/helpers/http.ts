import { BASE_URL, OTP_CAPTURE_FILE } from "../env";
import fs from "fs";

// Reads the sign-in code the test server captured for an email. The server
// writes codes here instead of calling Resend when OTP_TEST_CAPTURE_FILE is
// set (see server/auth/otp.ts).
export function readCapturedOtp(email: string): string {
  const data = JSON.parse(fs.readFileSync(OTP_CAPTURE_FILE, "utf-8"));
  const code = data[email.trim().toLowerCase()];
  if (!code) {
    throw new Error(`No captured OTP code for ${email}`);
  }
  return code;
}

export interface ApiResponse {
  status: number;
  body: any;
  headers: Headers;
}

// Minimal fetch wrapper that keeps a cookie jar, so each client acts like a
// separate logged-in browser session.
export class TestClient {
  private cookies = new Map<string, string>();

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private storeCookies(res: Response) {
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  async request(
    path: string,
    init: { method?: string; body?: any; formData?: FormData; headers?: Record<string, string> } = {}
  ): Promise<ApiResponse> {
    const headers: Record<string, string> = { ...init.headers };
    if (this.cookies.size > 0) headers["cookie"] = this.cookieHeader();

    let body: BodyInit | undefined;
    if (init.formData) {
      body = init.formData;
    } else if (init.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(init.body);
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method: init.method || "GET",
      headers,
      body,
    });
    this.storeCookies(res);

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // not JSON (file downloads, HTML, 204s)
    }
    return { status: res.status, body: parsed, headers: res.headers };
  }

  get(path: string) {
    return this.request(path);
  }
  post(path: string, body?: any) {
    return this.request(path, { method: "POST", body });
  }
  postForm(path: string, formData: FormData) {
    return this.request(path, { method: "POST", formData });
  }
  patch(path: string, body?: any) {
    return this.request(path, { method: "PATCH", body });
  }
  delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }

  async requestOtp(email: string) {
    return this.post("/api/auth/otp/send", { email });
  }

  async verifyOtp(email: string, code: string) {
    return this.post("/api/auth/otp/verify", { email, code });
  }

  // Passwordless sign-in: request a code, read it from the capture file the
  // test server writes (instead of emailing it), then verify it. Creates the
  // account automatically for a new email.
  async register(email: string) {
    const sent = await this.requestOtp(email);
    if (sent.status !== 200) return sent;
    const code = readCapturedOtp(email);
    return this.verifyOtp(email, code);
  }

  async login(email: string, password: string) {
    return this.post("/api/auth/login", { email, password });
  }

  async logout() {
    return this.post("/api/auth/logout");
  }
}

let counter = 0;
export function uniqueEmail(prefix = "user"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.quietcutter.dev`;
}

// Uploads go through ffmpeg on a queue, so files take a moment to finish.
export async function waitForFileStatus(
  client: TestClient,
  projectId: number,
  fileId: number,
  status: string,
  timeoutMs = 60_000
): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await client.get(`/api/projects/${projectId}`);
    const file = res.body?.files?.find((f: any) => f.id === fileId);
    if (file?.status === status) return file;
    if (status === "completed" && file?.status === "failed") {
      throw new Error(`File ${fileId} failed processing`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for file ${fileId} to reach status "${status}"`);
}
