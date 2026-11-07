import { json } from "@/lib/http";
import { safeSponsorRedirect, sponsorSlugOk } from "@/lib/redirects";
import { getRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!sponsorSlugOk(slug)) return json(404, { ok: false, error: "not_found" });
  const runtime = getRuntime();
  if (runtime.mode !== "postgres") return json(404, { ok: false, error: "not_found" });
  const current = await runtime.store.activeSponsor();
  if (!current || current.slug !== slug) return json(404, { ok: false, error: "not_found" });
  const target = safeSponsorRedirect(current.destinationUrl);
  if (!target) {
    try {
      await runtime.store.logError("redirect", "rejected", "Sponsor destination was not allowlisted");
    } catch {
      /* still refuse the redirect */
    }
    return json(404, { ok: false, error: "not_found" });
  }
  try {
    await runtime.store.logSponsorClick(current.id);
  } catch {
    return json(503, { ok: false, error: "not_logged" });
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
