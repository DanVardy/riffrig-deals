import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { seedEntries } from "@/lib/catalogue-data";
import { filterEntries, verifiedDeals } from "@/lib/filter";
import { buildFridayNewsletter } from "@/lib/newsletter";
import { expiryLabel, isVerifiedSale, publicPrice } from "@/lib/price";
import { sponsorStatsCopy } from "@/lib/site";
import type { Entry } from "@/lib/types";

const raw = readFileSync("data/catalogue.json", "utf8");

describe("catalogue", () => {
  it("lists individual sourced products and no active deals", () => {
    expect(seedEntries.length).toBeGreaterThanOrEqual(30);
    expect(new Set(seedEntries.map((entry) => entry.category))).toEqual(
      new Set(["amp-sim", "effects", "cabinet-ir", "recording", "amp-capture"]),
    );
    expect(seedEntries.every((entry) => entry.activeDeal === false)).toBe(true);
    expect(seedEntries.every((entry) => entry.osFormats === null)).toBe(true);
    expect(seedEntries.every((entry) => entry.officialUrl.startsWith("https://"))).toBe(true);
    expect(verifiedDeals(seedEntries)).toEqual([]);
    const metal = seedEntries.filter((entry) => entry.genreTags.includes("metal"));
    expect(metal.length).toBeGreaterThan(0);
    expect(metal.length).toBeLessThan(seedEntries.length);
    expect(filterEntries(seedEntries, {}).length).toBe(seedEntries.length);
  });

  it("does not publish machine-extracted prices or excluded shop windows", () => {
    for (const banned of ["29.99", "199.99", "199.00", "affiliate", "EUR"]) {
      expect(raw.includes(banned)).toBe(false);
    }
    const forbidden = [
      "https://www.igniteamps.com/",
      "https://audioassault.mx/",
      "https://joeysturgistones.com/",
      "https://www.tone3000.com/",
      "https://www.yorkaudio.com/",
      "https://www.two-notes.com/en/genome",
    ];
    for (const url of forbidden) expect(raw.includes(url)).toBe(false);
    const reaper = seedEntries.find((entry) => entry.slug === "reaper");
    expect(reaper?.priceSummary).toContain("USD $60");
    expect(reaper?.priceSummary).toContain("USD $225");
    expect(reaper?.priceSummary).toContain("not recorded as a temporary sale");
    expect(reaper?.activeDeal).toBe(false);
    expect(publicPrice(seedEntries.find((entry) => entry.slug === "audacity") as Entry).label).toBe("Free");
    expect(publicPrice(seedEntries.find((entry) => entry.slug === "neural-amp-modeler") as Entry).label).toBe("Free");
    expect(publicPrice(seedEntries.find((entry) => entry.slug === "amplitube-5") as Entry).label).toBe("Price not verified");
    expect(publicPrice(seedEntries.find((entry) => entry.slug === "tonex-2") as Entry).label).toBe("Price not verified");
  });

  it("labels a verified sale with no end date as expiry unknown", () => {
    const base = seedEntries[0];
    const sale: Entry = {
      ...base,
      activeDeal: true,
      priceStatus: "verified_sale",
      saleAmount: 19,
      saleCurrency: "USD",
      saleVerifiedAt: "2026-11-07T16:40:00.000Z",
      saleExpiresAt: null,
      saleExpiryUnknown: true,
    };
    expect(isVerifiedSale(sale)).toBe(true);
    expect(expiryLabel(sale)).toBe("expiry unknown");
    const stray: Entry = { ...base, priceStatus: "unverified", priceAmount: 29.99, priceCurrency: "EUR", activeDeal: false };
    expect(isVerifiedSale(stray)).toBe(false);
    expect(publicPrice(stray).label).toBe("Price not verified");
    expect(publicPrice(stray).detail.includes("29.99")).toBe(false);
  });
});

describe("friday newsletter", () => {
  it("prepares five catalogue picks and adds a sponsor line only when sold", () => {
    const plain = buildFridayNewsletter({ entries: seedEntries, issueDate: "8 Nov 2026" });
    expect(plain.picks).toHaveLength(5);
    expect(plain.picks.every((pick) => pick.kind === "catalogue")).toBe(true);
    expect(plain.sponsorLine).toBeNull();
    expect(plain.text.toLowerCase().includes("sponsored")).toBe(false);
    expect(plain.text.toLowerCase().includes("not discounts")).toBe(true);
    const unsold = buildFridayNewsletter({
      entries: seedEntries,
      issueDate: "8 Nov 2026",
      sponsor: { name: "Amp Co", sold: false },
    });
    expect(unsold.sponsorLine).toBeNull();
    const sold = buildFridayNewsletter({
      entries: seedEntries,
      issueDate: "8 Nov 2026",
      sponsor: { name: "Amp Co", sold: true },
    });
    expect(sold.sponsorLine).toBe("Sponsored: Amp Co.");
  });
});

describe("sponsor stats copy", () => {
  it("distinguishes unavailable from a measured zero", () => {
    expect(sponsorStatsCopy({ mode: "unavailable" })).toContain("unavailable");
    expect(sponsorStatsCopy({ mode: "measured", clicks: 0, soldWeeks: 0, pageviews: 0 })).toContain("0 sponsor clicks");
  });
});
