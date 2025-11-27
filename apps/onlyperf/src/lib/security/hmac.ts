import crypto from "crypto";

export function signBodyHmacSha256(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function buildSignedHeaders(body: unknown, secret: string) {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBodyHmacSha256(`${raw}.${timestamp}`, secret);

  return { signature, timestamp, raw };
}
