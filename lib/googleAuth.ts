import { createSign } from "crypto";
import { env } from "@/lib/config";

type GoogleTokenResponse = {
  access_token: string;
};

export async function createGoogleAccessToken(scope: string) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: env.googleServiceAccountEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 60 * 60,
    iat: now,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google OAuth read-only token request failed: ${response.status}`);
  }

  const data = (await response.json()) as GoogleTokenResponse;
  return data.access_token;
}

function signJwt(payload: Record<string, unknown>) {
  const privateKey = env.googleServiceAccountPrivateKey?.replace(/\\n/g, "\n");
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(privateKey ?? "");
  return `${signingInput}.${base64Url(signature)}`;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
