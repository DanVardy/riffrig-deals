import { guardMutation } from "@/lib/guard";
import { json, payloadTooLarge, readPayload } from "@/lib/http";
import { getRuntime, notPersisted } from "@/lib/runtime";
import { actionResponse } from "@/lib/respond";
import { createEnquiry } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guardMutation(request, "enquiry", 6);
  if (blocked) return blocked;
  const payload = await readPayload(request);
  if (payloadTooLarge(payload)) return json(413, { ok: false, persisted: false, error: "too_large" });
  const runtime = getRuntime();
  if (runtime.mode !== "postgres") return actionResponse(request, notPersisted(), "/sponsors");
  const result = await createEnquiry(runtime.store, payload);
  return actionResponse(request, result, "/sponsors");
}
