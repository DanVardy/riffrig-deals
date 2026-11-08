import { requireAdmin } from "@/lib/admin-auth";
import { guardMutation } from "@/lib/guard";
import { json, payloadTooLarge, readPayload } from "@/lib/http";
import { getRuntime } from "@/lib/runtime";
import { updateCataloguePrice } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guardMutation(request, "admin-write", 30);
  if (blocked) return blocked;
  const denied = requireAdmin(request);
  if (denied) return denied;
  const payload = await readPayload(request);
  if (payloadTooLarge(payload)) return json(413, { ok: false, error: "too_large" });
  const runtime = getRuntime();
  if (runtime.mode !== "postgres") return json(503, { ok: false, error: "persistence_unavailable" });
  const result = await updateCataloguePrice(runtime.store, payload);
  return json(result.status, result.body);
}
