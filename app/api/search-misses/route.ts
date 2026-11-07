import { guardMutation } from "@/lib/guard";
import { json, payloadTooLarge, readPayload } from "@/lib/http";
import { getRuntime } from "@/lib/runtime";
import { recordSearchMiss } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guardMutation(request, "search-miss", 20);
  if (blocked) return blocked;
  const payload = await readPayload(request);
  if (payloadTooLarge(payload)) return json(413, { logged: false, persisted: false, error: "too_large" });
  const runtime = getRuntime();
  if (runtime.mode !== "postgres") return json(200, { logged: false, persisted: false });
  const result = await recordSearchMiss(runtime.store, payload);
  return json(result.status, result.body);
}
