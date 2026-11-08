import { isVerifiedSale } from "./price";
import { CATEGORY_LABELS, type Category, type Entry } from "./types";

export type DealFilter = "" | "verified" | "unverified";
export type CatalogueSort = "name" | "name-desc";

export type CatalogueFilters = {
  query?: string;
  category?: string;
  genre?: string;
  vendor?: string;
  deal?: string;
};

export function nameSortKey(name: string): string {
  return name.replace(/^[^a-z0-9]+/i, "");
}

export function sortEntries(entries: Entry[], sort: CatalogueSort = "name"): Entry[] {
  const sorted = [...entries].sort((a, b) => nameSortKey(a.name).localeCompare(nameSortKey(b.name), "en", { sensitivity: "base" }));
  return sort === "name-desc" ? sorted.reverse() : sorted;
}

export function filterEntries(entries: Entry[], filters: CatalogueFilters): Entry[] {
  const query = (filters.query ?? "").trim().toLowerCase();
  const category = filters.category ?? "";
  const genre = (filters.genre ?? "").trim().toLowerCase();
  const vendor = filters.vendor ?? "";
  const deal = filters.deal ?? "";
  return entries.filter((entry) => {
    if (category && entry.category !== category) return false;
    if (vendor && entry.vendor !== vendor) return false;
    if (genre && !entry.genreTags.some((tag) => tag.toLowerCase() === genre)) return false;
    if (deal === "verified" && !isVerifiedSale(entry)) return false;
    if (deal === "unverified" && isVerifiedSale(entry)) return false;
    if (!query) return true;
    const haystack = [entry.name, entry.vendor, entry.summary, CATEGORY_LABELS[entry.category as Category] ?? entry.category]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function verifiedDeals(entries: Entry[]): Entry[] {
  return entries.filter((entry) => isVerifiedSale(entry));
}
