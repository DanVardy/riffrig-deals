import { createHash, createHmac, timingSafeEqual } from "crypto";

export function unsubscribeSecret(): string | null {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? "";
  if (secret.length < 16) return null;
  return secret;
}

export function createUnsubscribeToken(id: string, secret: string): string {
  const body = `v1.${id}`;
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, id, sig] = parts;
  if (version !== "v1" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = createHmac("sha256", secret).update(`v1.${id}`).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;
  return id;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
