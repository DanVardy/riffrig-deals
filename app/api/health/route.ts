import { healthDecision } from "@/lib/health";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const decision = healthDecision();
  return json(decision.status, decision.body);
}
