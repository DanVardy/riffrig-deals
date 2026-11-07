export function productionBlocked(env = process.env) {
  return env.NODE_ENV === "production" && !env.DATABASE_URL;
}

export function blockedBody(pathname) {
  if (pathname === "/api/health") return { ok: false, ready: false };
  if (pathname.startsWith("/api/")) return { ok: false, persisted: false, error: "persistence_unavailable" };
  return null;
}

export const blockedHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RiffRig Deals is not available</title><body style="margin:0;background:#17130f;color:#f4ecdf;font-family:Georgia,serif"><main style="max-width:36rem;margin:0 auto;padding:2.5rem 1.1rem"><h1>RiffRig Deals is not available</h1><p>This production copy has no database configured. Catalogue, signups, and submissions are switched off rather than pretending to save.</p></main>`;
