import { isVerifiedSale } from "./price";
import { CATEGORY_LABELS, type Category, type Entry } from "./types";

export type CatalogueFilters = {
  query?: string;
  category?: string;
  genre?: string;
};

export function filterEntries(entries: Entry[], filters: CatalogueFilters): Entry[] {
  const query = (filters.query ?? "").trim().toLowerCase();
  const category = filters.category ?? "";
  const genre = (filters.genre ?? "").trim().toLowerCase();
  return entries.filter((entry) => {
    if (category && entry.category !== category) return false;
    if (genre && !entry.genreTags.some((tag) => tag.toLowerCase() === genre)) return false;
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
