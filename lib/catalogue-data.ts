import raw from "@/data/catalogue.json";
import { CATEGORIES, type Category, type Entry, type PriceStatus } from "./types";

const PRICE_STATUSES: PriceStatus[] = ["unverified", "verified_free", "verified_list", "verified_sale"];

function asEntry(value: unknown, index: number): Entry {
  if (!value || typeof value !== "object") throw new Error(`catalogue row ${index} is not an object`);
  const row = value as Record<string, unknown>;
  const category = row.category;
  const priceStatus = row.priceStatus;
  if (typeof category !== "string" || !CATEGORIES.includes(category as Category)) {
    throw new Error(`catalogue row ${index} has a bad category`);
  }
  if (typeof priceStatus !== "string" || !PRICE_STATUSES.includes(priceStatus as PriceStatus)) {
    throw new Error(`catalogue row ${index} has a bad price status`);
  }
  return {
    slug: String(row.slug),
    vendor: String(row.vendor),
    name: String(row.name),
    category: category as Category,
    summary: String(row.summary),
    officialUrl: String(row.officialUrl),
    genreTags: Array.isArray(row.genreTags) ? row.genreTags.map(String) : [],
    osFormats: row.osFormats == null ? null : String(row.osFormats),
    priceStatus: priceStatus as PriceStatus,
    priceAmount: typeof row.priceAmount === "number" ? row.priceAmount : null,
    priceCurrency: row.priceCurrency == null ? null : String(row.priceCurrency),
    priceSummary: row.priceSummary == null ? null : String(row.priceSummary),
    priceVerifiedAt: row.priceVerifiedAt == null ? null : String(row.priceVerifiedAt),
    sourceCheckedAt: row.sourceCheckedAt == null ? null : String(row.sourceCheckedAt),
    sourceNote: row.sourceNote == null ? null : String(row.sourceNote),
    priceSourceUrl: row.priceSourceUrl == null ? null : String(row.priceSourceUrl),
    saleAmount: typeof row.saleAmount === "number" ? row.saleAmount : null,
    saleCurrency: row.saleCurrency == null ? null : String(row.saleCurrency),
    saleVerifiedAt: row.saleVerifiedAt == null ? null : String(row.saleVerifiedAt),
    saleExpiresAt: row.saleExpiresAt == null ? null : String(row.saleExpiresAt),
    saleExpiryUnknown: Boolean(row.saleExpiryUnknown),
    activeDeal: Boolean(row.activeDeal),
  };
}

function sortKey(name: string): string {
  return name.replace(/^[^a-z0-9]+/i, "");
}

export const seedEntries: Entry[] = (raw as unknown[]).map(asEntry).sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), "en"));
