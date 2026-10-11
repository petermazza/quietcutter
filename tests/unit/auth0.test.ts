import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyAuth0IdToken } from "../../server/auth/auth0";

// Exercises the real token verification path: we stand in for Auth0's public
// key directory (the server fetches it over HTTP, so fetch is stubbed) and
// sign tokens the same way Auth0 would.
const DOMAIN = "unit-test.auth0.example";
const CLIENT_ID = "unit-test-client-id";
const ISSUER = `https://${DOMAIN}/`;

process.env.AUTH0_DOMAIN = DOMAIN;
process.env.AUTH0_CLIENT_ID = CLIENT_ID;

let privateKey: any;
let wrongPrivateKey: any;

function signToken(opts: {
  iss?: string;
  aud?: string;
  key?: any;
  expiresIn?: string;
} = {}) {
  const { iss = ISSUER, aud = CLIENT_ID, key = privateKey, expiresIn = "1h" } = opts;
  return new SignJWT({
    nonce: "the-nonce",
    email: "person@example.com",
    given_name: "Person",
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject("auth0|user1")
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  const wrongPair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  wrongPrivateKey = wrongPair.privateKey;

  const publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = "test-key";

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any) => {
      if (String(input).includes(`${DOMAIN}/.well-known/jwks.json`)) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    })
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Auth0 ID token verification", () => {
  it("accepts a properly signed token and returns its claims", async () => {
    const payload = await verifyAuth0IdToken(await signToken(), "the-nonce");
    expect(payload.email).toBe("person@example.com");
    expect(payload.given_name).toBe("Person");
  });

  it("rejects a token issued for a different login attempt", async () => {
    await expect(verifyAuth0IdToken(await signToken(), "other-nonce")).rejects.toThrow();
  });

  it("rejects a token meant for a different app", async () => {
    const token = await signToken({ aud: "someone-elses-client-id" });
    await expect(verifyAuth0IdToken(token, "the-nonce")).rejects.toThrow();
  });

  it("rejects a token from a different issuer", async () => {
    const token = await signToken({ iss: "https://evil.example/" });
    await expect(verifyAuth0IdToken(token, "the-nonce")).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signToken({ expiresIn: "-1s" });
    await expect(verifyAuth0IdToken(token, "the-nonce")).rejects.toThrow();
  });

  it("rejects a token signed by a different key", async () => {
    const token = await signToken({ key: wrongPrivateKey });
    await expect(verifyAuth0IdToken(token, "the-nonce")).rejects.toThrow();
  });

  it("rejects a token that is not a token at all", async () => {
    await expect(verifyAuth0IdToken("totally-forged", "the-nonce")).rejects.toThrow();
  });
});
