import { describe, expect, it } from "vitest";
import fs from "fs";
import { TestClient, uniqueEmail, waitForFileStatus } from "../helpers/http";
import { formWithFile, makeAudioWithSilence, tmpFile } from "../helpers/media";
import { makeUserPro } from "../helpers/db";

async function proClient(): Promise<{ client: TestClient; userId: string }> {
  const client = new TestClient();
  const res = await client.register(uniqueEmail("pro"));
  const userId = res.body.user.id;
  await makeUserPro(userId);
  return { client, userId };
}

describe("pro features", () => {
  it("reports Pro status for subscribers and not for free users", async () => {
    const { client } = await proClient();
    const pro = await client.get("/api/subscription/status");
    expect(pro.body.isPro).toBe(true);

    const free = new TestClient();
    await free.register(uniqueEmail("free"));
    const freeStatus = await free.get("/api/subscription/status");
    expect(freeStatus.body.isPro).toBe(false);
  });

  it("lets Pro users save, list and delete custom presets", async () => {
    const { client } = await proClient();

    const created = await client.post("/api/presets", {
      name: "My Preset",
      silenceThreshold: -38,
      minSilenceDuration: 450,
    });
    expect(created.status).toBe(201);

    const list = await client.get("/api/presets");
    expect(list.body.map((p: any) => p.name)).toContain("My Preset");

    const del = await client.delete(`/api/presets/${created.body.id}`);
    expect(del.status).toBe(204);
  });

  it("blocks preset saving for free users and anonymous visitors", async () => {
    const anon = new TestClient();
    expect((await anon.post("/api/presets", { name: "x" })).status).toBe(401);

    const free = new TestClient();
    await free.register(uniqueEmail("freepreset"));
    expect((await free.post("/api/presets", { name: "x" })).status).toBe(403);
  });

  it("outputs WAV and streams previews (with ranges) for Pro users", async () => {
    const { client } = await proClient();
    const wav = await makeAudioWithSilence(tmpFile("pro.wav"));

    const res = await client.postForm(
      "/api/upload",
      formWithFile("audio", wav, { outputFormat: "wav", minSilenceDuration: "800" })
    );
    expect(res.status).toBe(201);

    const file = res.body.files[0];
    const done = await waitForFileStatus(client, res.body.id, file.id, "completed");
    expect(done.outputFormat).toBe("wav");
    expect(done.processedFilePath).toMatch(/_processed\.wav$/);

    const preview = await client.get(`/api/files/${file.id}/preview`);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toBe("audio/wav");

    const ranged = await client.request(`/api/files/${file.id}/preview`, {
      headers: { range: "bytes=0-99" },
    });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("content-range")).toMatch(/^bytes 0-99\//);
  });

  it("accepts batch uploads and returns ZIPs of processed files", async () => {
    const { client } = await proClient();
    const wav = await makeAudioWithSilence(tmpFile("batch.wav"));
    const data = fs.readFileSync(wav);

    const form = new FormData();
    form.append("projectName", "Batch Test");
    form.append("audio", new Blob([data]), "one.wav");
    form.append("audio", new Blob([data]), "two.wav");

    const res = await client.postForm("/api/upload", form);
    expect(res.status).toBe(201);
    expect(res.body.files.length).toBe(2);

    for (const file of res.body.files) {
      await waitForFileStatus(client, res.body.id, file.id, "completed");
    }

    const bulk = await client.get("/api/projects/bulk-download");
    expect(bulk.status).toBe(200);
    expect(bulk.headers.get("content-type")).toBe("application/zip");

    const batch = await client.post("/api/files/batch-download", {
      fileIds: res.body.files.map((f: any) => f.id),
    });
    expect(batch.status).toBe(200);
    expect(batch.headers.get("content-type")).toBe("application/zip");
  });

  it("blocks bulk download for free users", async () => {
    const free = new TestClient();
    await free.register(uniqueEmail("freebulk"));
    const res = await free.get("/api/projects/bulk-download");
    expect(res.status).toBe(403);
  });
});
