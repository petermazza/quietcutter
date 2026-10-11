import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// The JWKS endpoint is fetched lazily and cached; jose refetches when a
// token arrives signed by a key id it hasn't seen (normal Auth0 rotation).
let cachedDomain: string | undefined;
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks(domain: string) {
  if (!jwks || cachedDomain !== domain) {
    cachedDomain = domain;
    jwks = createRemoteJWKSet(
      new URL(`https://${domain}/.well-known/jwks.json`)
    );
  }
  return jwks;
}

// Cryptographically verifies an Auth0 ID token — signature, issuer,
// audience and expiry — then binds it to this login attempt via the nonce.
// Throws on any failure; the caller decides the HTTP response.
export async function verifyAuth0IdToken(
  idToken: string,
  nonce: string
): Promise<JWTPayload> {
  const domain = process.env.AUTH0_DOMAIN!;
  const { payload } = await jwtVerify(idToken, getJwks(domain), {
    issuer: `https://${domain}/`,
    audience: process.env.AUTH0_CLIENT_ID!,
  });
  if (payload.nonce !== nonce) {
    throw new Error("Auth0 token nonce mismatch");
  }
  return payload;
}
