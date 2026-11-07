import type { Entry } from "./types";

export function formatChecked(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
  return `${formatted} AWST`;
}

export function isVerifiedSale(entry: Entry): boolean {
  if (!entry.activeDeal || entry.priceStatus !== "verified_sale") return false;
  if (entry.saleAmount == null || !entry.saleCurrency || !entry.saleVerifiedAt) return false;
  if (!entry.saleExpiresAt && !entry.saleExpiryUnknown) return false;
  return true;
}

export function expiryLabel(entry: Entry): string | null {
  if (!isVerifiedSale(entry)) return null;
  if (entry.saleExpiresAt) return `Ends ${formatChecked(entry.saleExpiresAt)}`;
  return "expiry unknown";
}

export type PublicPrice = {
  label: string;
  detail: string;
  verified: boolean;
};

export function publicPrice(entry: Entry): PublicPrice {
  if (entry.priceStatus === "verified_free" && entry.priceVerifiedAt) {
    return {
      label: "Free",
      detail: `Checked ${formatChecked(entry.priceVerifiedAt)}`,
      verified: true,
    };
  }
  if (entry.priceStatus === "verified_list" && entry.priceVerifiedAt && entry.priceSummary) {
    return {
      label: "Price checked",
      detail: entry.priceSummary,
      verified: true,
    };
  }
  if (
    entry.priceStatus === "verified_list" &&
    entry.priceVerifiedAt &&
    entry.priceAmount != null &&
    entry.priceCurrency
  ) {
    return {
      label: formatMoney(entry.priceAmount, entry.priceCurrency),
      detail: `List price checked ${formatChecked(entry.priceVerifiedAt)}`,
      verified: true,
    };
  }
  if (isVerifiedSale(entry)) {
    return {
      label: formatMoney(entry.saleAmount as number, entry.saleCurrency as string),
      detail: `${expiryLabel(entry)}. Checked ${formatChecked(entry.saleVerifiedAt as string)}`,
      verified: true,
    };
  }
  const reached = entry.sourceCheckedAt
    ? `Official page reached ${formatChecked(entry.sourceCheckedAt)}.`
    : "No price check on file.";
  return { label: "Price not verified", detail: reached, verified: false };
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, currencyDisplay: "code" }).format(amount);
}
