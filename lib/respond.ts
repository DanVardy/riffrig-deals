import { simplePage, escapeHtml } from "./html";
import { json, wantsJson } from "./http";
import { siteUrl } from "./site";
import type { ActionResult } from "./services";

const REDIRECT_RESULTS = new Set(["saved", "not_saved", "invalid", "rejected", "unsubscribed", "already"]);

export function resultCode(result: ActionResult): string {
  if (result.body.error === "invalid") return "invalid";
  if (result.body.error === "rejected") return "rejected";
  if (result.body.already && result.body.status === "unsubscribed") return "already";
  if (result.body.status === "unsubscribed") return "unsubscribed";
  if (result.body.persisted === true && result.body.ok === true) return "saved";
  return "not_saved";
}

export function actionResponse(request: Request, result: ActionResult, redirectBase?: string): Response {
  if (wantsJson(request)) return json(result.status, result.body);
  if (typeof result.body.unsubscribePath === "string") {
    const link = escapeHtml(result.body.unsubscribePath);
    const message = escapeHtml(String(result.body.message ?? ""));
    return new Response(
      simplePage(
        "Signup recorded",
        `<p>${message}</p><p>Save this unsubscribe link. It is shown once and is not emailed while sending is off.</p><p><a style="color:#ffd27a" href="${link}">Unsubscribe</a></p>`,
      ),
      { status: result.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
  if (redirectBase) {
    const code = resultCode(result);
    const safe = REDIRECT_RESULTS.has(code) ? code : "not_saved";
    return Response.redirect(new URL(`${redirectBase}?result=${safe}`, siteUrl()), 303);
  }
  return new Response(simplePage(result.body.ok ? "Saved" : "Not saved", `<p>${escapeHtml(String(result.body.message ?? "Not saved."))}</p>`), {
    status: result.status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
