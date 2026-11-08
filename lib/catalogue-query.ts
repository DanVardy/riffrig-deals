import type { CatalogueSort, DealFilter } from "./filter";

export type CatalogueQuery = {
  q: string;
  category: string;
  genre: string;
  vendor: string;
  deal: DealFilter;
  sort: CatalogueSort;
};

export const defaultCatalogueQuery: CatalogueQuery = {
  q: "",
  category: "",
  genre: "",
  vendor: "",
  deal: "",
  sort: "name",
};

export function parseDeal(value: string | undefined): DealFilter {
  return value === "verified" || value === "unverified" ? value : "";
}

export function parseSort(value: string | undefined): CatalogueSort {
  return value === "name-desc" ? "name-desc" : "name";
}

export function catalogueHref(query: CatalogueQuery): string {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q);
  if (query.category) params.set("category", query.category);
  if (query.genre) params.set("genre", query.genre);
  if (query.vendor) params.set("vendor", query.vendor);
  if (query.deal) params.set("deal", query.deal);
  if (query.sort === "name-desc") params.set("sort", query.sort);
  const qs = params.toString();
  return qs ? `/catalogue?${qs}` : "/catalogue";
}

export function safeReturnPath(value: string | undefined): string {
  if (!value) return "/catalogue";
  if (value.startsWith("//") || value.includes("://") || value.includes("\\")) return "/catalogue";
  if (value === "/" || value.startsWith("/catalogue") || value.startsWith("/deals") || value.startsWith("/?")) return value;
  return "/catalogue";
}
