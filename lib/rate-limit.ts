import { createHash } from "crypto";

type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function resetRateLimits(): void {
  buckets.clear();
}

export function clientKey(request: Request, bucket: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 20);
  return `${bucket}:${hash}`;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.hits >= limit) return false;
  current.hits += 1;
  return true;
}
