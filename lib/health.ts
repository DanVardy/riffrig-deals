import { leadmailIsEnabled, readLeadmailConfig } from "./leadmail";

export function healthDecision(env: NodeJS.ProcessEnv = process.env): { status: number; body: Record<string, unknown> } {
  const production = env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
  const database = Boolean(env.DATABASE_URL);
  const admin = (env.ADMIN_TOKEN ?? "").length >= 16;
  const unsubscribe = (env.UNSUBSCRIBE_SECRET ?? "").length >= 16;
  const ready = database && admin && unsubscribe;
  const leadmail = leadmailIsEnabled(readLeadmailConfig(env)) ? "enabled" : "disabled";
  if (production && !ready) {
    return { status: 503, body: { ok: false, ready: false } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      ready,
      persistence: database ? "postgres" : "preview",
      leadmail,
    },
  };
}
