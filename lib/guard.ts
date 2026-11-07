import { json, rejectCrossSite } from "./http";
import { clientKey, rateLimit } from "./rate-limit";

export function guardMutation(request: Request, bucket: string, limit = 8): Response | null {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  if (!rateLimit(clientKey(request, bucket), limit, 10 * 60 * 1000)) {
    return json(429, { ok: false, persisted: false, error: "rate_limited" });
  }
  return null;
}
