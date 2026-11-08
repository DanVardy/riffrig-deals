import { describe, expect, it } from "vitest";
import { seedEntries } from "@/lib/catalogue-data";
import { catalogueHref, safeReturnPath } from "@/lib/catalogue-query";
import { filterEntries, sortEntries } from "@/lib/filter";
import type { Entry } from "@/lib/types";

describe("catalogue filters", () => {
  it("matches trimmed case-insensitive search and ignores blank queries", () => {
    expect(filterEntries(seedEntries, { query: "   " })).toHaveLength(seedEntries.length);
    const found = filterEntries(seedEntries, { query: "  reaper " });
    expect(found.map((entry) => entry.slug)).toEqual(["reaper"]);
  });

  it("filters by developer, genre, and verified status without inventing a deal", () => {
    const neural = filterEntries(seedEntries, { vendor: "Neural DSP" });
    expect(neural.length).toBeGreaterThan(0);
    expect(neural.every((entry) => entry.vendor === "Neural DSP")).toBe(true);
    const metal = filterEntries(seedEntries, { genre: "metal" });
    expect(metal.length).toBeGreaterThan(0);
    expect(metal.length).toBeLessThan(seedEntries.length);
    expect(filterEntries(seedEntries, { deal: "verified" })).toEqual([]);
    expect(filterEntries(seedEntries, { deal: "unverified" })).toHaveLength(seedEntries.length);
  });

  it("sorts by name and does not rank mixed currencies", () => {
    const priced: Entry[] = [
      { ...seedEntries[0], name: "Zed", slug: "zed", priceAmount: 1, priceCurrency: "USD" },
      { ...seedEntries[1], name: "Aye", slug: "aye", priceAmount: 500, priceCurrency: "EUR" },
    ];
    expect(sortEntries(priced, "name").map((entry) => entry.name)).toEqual(["Aye", "Zed"]);
    expect(sortEntries(priced, "name-desc").map((entry) => entry.name)).toEqual(["Zed", "Aye"]);
    expect(catalogueHref({ q: "  amp ", category: "amp-sim", genre: "", vendor: "", deal: "verified", sort: "name" })).toBe(
      "/catalogue?q=amp&category=amp-sim&deal=verified",
    );
    expect(safeReturnPath("https://evil.example")).toBe("/catalogue");
    expect(safeReturnPath("/catalogue?q=amp")).toBe("/catalogue?q=amp");
  });
});
