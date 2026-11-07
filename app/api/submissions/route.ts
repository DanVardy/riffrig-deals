import { guardMutation } from "@/lib/guard";
import { json, payloadTooLarge, readPayload } from "@/lib/http";
import { getRuntime, notPersisted } from "@/lib/runtime";
import { actionResponse } from "@/lib/respond";
import { createSubmission } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guardMutation(request, "submission", 8);
  if (blocked) return blocked;
  const payload = await readPayload(request);
  if (payloadTooLarge(payload)) return json(413, { ok: false, persisted: false, error: "too_large" });
  const runtime = getRuntime();
  if (runtime.mode !== "postgres") return actionResponse(request, notPersisted(), "/submit");
  const result = await createSubmission(runtime.store, payload);
  return actionResponse(request, result, "/submit");
}
