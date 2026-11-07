import { expiryLabel, isVerifiedSale, publicPrice } from "./price";
import type { Entry } from "./types";

const PREFERRED_SLUGS = [
  "neural-amp-modeler",
  "helix-native",
  "echoboy",
  "ownhammer-heavy-hitters-1",
  "reaper",
];

export type NewsletterSponsor = {
  name: string;
  sold: boolean;
};

export type NewsletterPick = {
  name: string;
  vendor: string;
  kind: "verified_sale" | "catalogue";
  line: string;
  url: string;
};

export type FridayNewsletter = {
  subject: string;
  text: string;
  html: string;
  picks: NewsletterPick[];
  sponsorLine: string | null;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function buildFridayNewsletter(input: {
  entries: Entry[];
  issueDate: string;
  sponsor?: NewsletterSponsor | null;
}): FridayNewsletter {
  const deals = input.entries.filter(isVerifiedSale).slice(0, 5);
  const used = new Set(deals.map((entry) => entry.slug));
  const catalogue: Entry[] = [];
  for (const slug of PREFERRED_SLUGS) {
    if (deals.length + catalogue.length >= 5) break;
    const entry = input.entries.find((item) => item.slug === slug && !used.has(item.slug));
    if (!entry) continue;
    used.add(entry.slug);
    catalogue.push(entry);
  }
  const filler = [...input.entries].sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of filler) {
    if (deals.length + catalogue.length >= 5) break;
    if (used.has(entry.slug)) continue;
    used.add(entry.slug);
    catalogue.push(entry);
  }

  const picks: NewsletterPick[] = [
    ...deals.map((entry) => ({
      name: entry.name,
      vendor: entry.vendor,
      kind: "verified_sale" as const,
      line: `${publicPrice(entry).label}. ${expiryLabel(entry)}.`,
      url: entry.officialUrl,
    })),
    ...catalogue.map((entry) => ({
      name: entry.name,
      vendor: entry.vendor,
      kind: "catalogue" as const,
      line: "Catalogue pick, not a verified sale.",
      url: entry.officialUrl,
    })),
  ];

  const sponsorLine = input.sponsor?.sold ? `Sponsored: ${input.sponsor.name}.` : null;
  const subject = deals.length
    ? `RiffRig Friday ${input.issueDate}: ${deals.length} verified sale${deals.length === 1 ? "" : "s"}`
    : `RiffRig Friday ${input.issueDate}: five catalogue picks`;

  const intro = deals.length
    ? "Verified sales are listed first. Any remaining picks are catalogue entries, not discounts."
    : "No verified sales this week. These five are catalogue picks, not discounts.";

  const textLines = [
    `RiffRig Deals — ${input.issueDate}`,
    intro,
    "",
    ...picks.map((pick, index) => `${index + 1}. ${pick.name} (${pick.vendor}) — ${pick.line} ${pick.url}`),
    "",
    sponsorLine,
    "Each sent letter gets its own unsubscribe link. This preview was not emailed.",
    "Direct vendor links only. No affiliate links are used in this template.",
  ].filter((line): line is string => line != null);

  const html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#241c14;background:#f6f0e6;padding:24px"><h1 style="font-size:28px;margin:0 0 8px">RiffRig Friday</h1><p>${escapeHtml(intro)}</p><ol>${picks
    .map(
      (pick) =>
        `<li><strong>${escapeHtml(pick.name)}</strong> — ${escapeHtml(pick.vendor)}<br>${escapeHtml(pick.line)} <a href="${escapeHtml(pick.url)}">Vendor page</a></li>`,
    )
    .join("")}</ol>${sponsorLine ? `<p>${escapeHtml(sponsorLine)}</p>` : ""}<p>Each sent letter gets its own unsubscribe link. This preview was not emailed.</p></body></html>`;

  return { subject, text: textLines.join("\n"), html, picks, sponsorLine };
}
