import { requireAdmin } from "@/lib/admin-auth";
import { guardMutation } from "@/lib/guard";
import { json } from "@/lib/http";
import { getRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = guardMutation(request, "admin-read", 60);
  if (blocked) return blocked;
  const denied = requireAdmin(request);
  if (denied) return denied;
  const runtime = getRuntime();
  if (runtime.mode !== "postgres") return json(503, { ok: false, error: "persistence_unavailable" });
  const searches = await runtime.store.listSearchMisses();
  return json(200, { ok: true, searches });
}
