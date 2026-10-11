import { importJWK, SignJWT } from "jose";
import fs from "fs";
import os from "os";
import path from "path";

// The global test setup generates this keypair and serves the public half as
// a JWKS to the test server (via AUTH0_JWKS_URL). Tests read the private half
// from this file to sign tokens exactly the way Auth0 would.
export const AUTH0_KEY_FILE = path.join(
  os.tmpdir(),
  "quietcutter-auth0-test-key.json"
);

export const AUTH0_TEST_DOMAIN = "test.auth0.local";
export const AUTH0_TEST_ISSUER = `https://${AUTH0_TEST_DOMAIN}/`;
export const AUTH0_TEST_CLIENT_ID = "quietcutter-test-client";

export async function signAuth0TestToken(
  claims: Record<string, unknown> = {}
): Promise<string> {
  const jwk = JSON.parse(fs.readFileSync(AUTH0_KEY_FILE, "utf8"));
  const key = await importJWK(jwk, "RS256");
  const { iss, aud, ...rest } = claims;
  return new SignJWT({
    email: "auth0user@example.com",
    nonce: "test-nonce",
    email_verified: true,
    ...rest,
  })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuer(typeof iss === "string" ? iss : AUTH0_TEST_ISSUER)
    .setAudience(typeof aud === "string" ? aud : AUTH0_TEST_CLIENT_ID)
    .setSubject("auth0|test-user")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}
