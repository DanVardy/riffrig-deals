export function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return url;
  } catch {
    /* use the local preview origin */
  }
  return new URL("http://localhost:3000");
}

export function sponsorStatsCopy(
  input: { mode: "unavailable" } | { mode: "measured"; clicks: number; soldWeeks: number; pageviews: number },
): string {
  if (input.mode === "unavailable") {
    return "Sponsor statistics are unavailable. This preview is not measuring clicks, pageviews, or sold weeks, so there is no zero to report.";
  }
  return `${input.clicks} sponsor clicks recorded. ${input.soldWeeks} weeks sold. ${input.pageviews} pageviews recorded. These are stored totals, not estimates.`;
}

export const RESULT_COPY: Record<string, string> = {
  saved: "Saved.",
  not_saved: "Not saved. Nothing was stored and no email was sent.",
  invalid: "Check the form and try again.",
  rejected: "That could not be accepted.",
  unsubscribed: "Unsubscribed. This address will not be added again automatically.",
  already: "This address is already unsubscribed.",
};
