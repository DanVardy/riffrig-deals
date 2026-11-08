import { httpsPublicUrl } from "./validate";
import type { Entry, PriceStatus } from "./types";

const CURRENCIES = new Set(["USD", "EUR", "GBP", "AUD", "CAD", "NZD", "CHF", "SEK", "NOK", "DKK", "JPY"]);
const KINDS = new Set(["verified_list", "verified_sale", "clear_sale", "clear_price"]);
const ALLOWED_KEYS = new Set([
  "slug",
  "kind",
  "currency",
  "listAmount",
  "saleAmount",
  "expiresAt",
  "expiryUnknown",
  "checkedAt",
  "sourceUrl",
  "sourceNote",
  "expectedUpdatedAt",
]);
const LOW_CLAIM = /historic(?:al)? low|lowest (?:ever|price)|all[- ]time low|record low/i;

export type PriceKind = "verified_list" | "verified_sale" | "clear_sale" | "clear_price";

export type PriceUpdate = {
  slug: string;
  kind: PriceKind;
  currency: string | null;
  listAmount: number | null;
  saleAmount: number | null;
  expiresAt: string | null;
  expiryUnknown: boolean;
  checkedAt: string;
  sourceUrl: string;
  sourceNote: string;
  expectedUpdatedAt: string | null;
};

export type PriceFields = Pick<
  Entry,
  | "priceStatus"
  | "priceAmount"
  | "priceCurrency"
  | "priceSummary"
  | "priceVerifiedAt"
  | "sourceCheckedAt"
  | "sourceNote"
  | "priceSourceUrl"
  | "saleAmount"
  | "saleCurrency"
  | "saleVerifiedAt"
  | "saleExpiresAt"
  | "saleExpiryUnknown"
  | "activeDeal"
>;

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function money(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 100000) return null;
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) return null;
  return cents / 100;
}

function isoInstant(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parsePriceUpdate(raw: unknown, now = Date.now()): { ok: true; value: PriceUpdate } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("Price update must be an object.");
  const body = raw as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) return fail("Unsupported field.");
  }
  if (typeof body.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || body.slug.length > 80) {
    return fail("Slug is not a catalogue slug.");
  }
  if (typeof body.kind !== "string" || !KINDS.has(body.kind)) return fail("Kind is not a price action.");
  const kind = body.kind as PriceKind;
  const checkedAt = isoInstant(body.checkedAt);
  if (!checkedAt) return fail("checkedAt must be an ISO time.");
  if (new Date(checkedAt).getTime() > now + 2 * 60 * 1000) return fail("checkedAt is in the future.");
  if (typeof body.sourceUrl !== "string" || !httpsPublicUrl(body.sourceUrl)) return fail("sourceUrl must be a public https URL.");
  if (typeof body.sourceNote !== "string") return fail("sourceNote is required.");
  const sourceNote = body.sourceNote.trim().replace(/\s+/g, " ");
  if (sourceNote.length < 12 || sourceNote.length > 400) return fail("sourceNote must explain the check.");
  if (LOW_CLAIM.test(sourceNote)) return fail("Historic-low claims are not accepted.");
  let expectedUpdatedAt: string | null = null;
  if (body.expectedUpdatedAt != null) {
    expectedUpdatedAt = isoInstant(body.expectedUpdatedAt);
    if (!expectedUpdatedAt) return fail("expectedUpdatedAt must be an ISO time.");
  }
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : null;
  if (kind === "verified_list" || kind === "verified_sale") {
    if (!currency || !CURRENCIES.has(currency)) return fail("currency must be an explicit ISO code.");
  } else if (body.currency != null || body.listAmount != null || body.saleAmount != null || body.expiresAt != null || body.expiryUnknown != null) {
    return fail("Clearing a price does not take amounts.");
  }

  if (kind === "verified_list") {
    const listAmount = money(body.listAmount);
    if (listAmount == null) return fail("listAmount must be a positive amount.");
    if (body.saleAmount != null || body.expiresAt != null || body.expiryUnknown != null) return fail("A list price is not a sale.");
    return {
      ok: true,
      value: {
        slug: body.slug,
        kind,
        currency,
        listAmount,
        saleAmount: null,
        expiresAt: null,
        expiryUnknown: false,
        checkedAt,
        sourceUrl: body.sourceUrl,
        sourceNote,
        expectedUpdatedAt,
      },
    };
  }

  if (kind === "verified_sale") {
    const saleAmount = money(body.saleAmount);
    if (saleAmount == null) return fail("saleAmount must be a positive amount.");
    const listAmount = body.listAmount == null ? null : money(body.listAmount);
    if (body.listAmount != null && listAmount == null) return fail("listAmount must be a positive amount.");
    if (listAmount != null && saleAmount >= listAmount) return fail("A sale price must be below the list price.");
    const expiresAt = body.expiresAt == null ? null : isoInstant(body.expiresAt);
    if (body.expiresAt != null && !expiresAt) return fail("expiresAt must be an ISO time.");
    const expiryUnknown = body.expiryUnknown === true;
    if (expiryUnknown && expiresAt) return fail("Set expiryUnknown or expiresAt, not both.");
    if (!expiryUnknown && !expiresAt) return fail("A sale needs an end time or expiry unknown.");
    if (expiresAt && new Date(expiresAt).getTime() < new Date(checkedAt).getTime()) return fail("expiresAt is before the check.");
    return {
      ok: true,
      value: {
        slug: body.slug,
        kind,
        currency,
        listAmount,
        saleAmount,
        expiresAt,
        expiryUnknown,
        checkedAt,
        sourceUrl: body.sourceUrl,
        sourceNote,
        expectedUpdatedAt,
      },
    };
  }

  return {
    ok: true,
    value: {
      slug: body.slug,
      kind,
      currency: null,
      listAmount: null,
      saleAmount: null,
      expiresAt: null,
      expiryUnknown: false,
      checkedAt,
      sourceUrl: body.sourceUrl,
      sourceNote,
      expectedUpdatedAt,
    },
  };
}

export function priceFieldsFor(current: Entry, update: PriceUpdate): PriceFields {
  const source = {
    sourceCheckedAt: update.checkedAt,
    sourceNote: update.sourceNote,
    priceSourceUrl: update.sourceUrl,
  };
  if (update.kind === "verified_list") {
    return {
      ...clearedSale(),
      ...source,
      priceStatus: "verified_list",
      priceAmount: update.listAmount,
      priceCurrency: update.currency,
      priceSummary: null,
      priceVerifiedAt: update.checkedAt,
      activeDeal: false,
    };
  }
  if (update.kind === "verified_sale") {
    return {
      ...source,
      priceStatus: "verified_sale",
      priceAmount: update.listAmount,
      priceCurrency: update.listAmount == null ? null : update.currency,
      priceSummary: null,
      priceVerifiedAt: update.listAmount == null ? null : update.checkedAt,
      saleAmount: update.saleAmount,
      saleCurrency: update.currency,
      saleVerifiedAt: update.checkedAt,
      saleExpiresAt: update.expiresAt,
      saleExpiryUnknown: update.expiryUnknown,
      activeDeal: true,
    };
  }
  if (update.kind === "clear_sale") {
    const keepList = current.priceAmount != null && Boolean(current.priceCurrency) && Boolean(current.priceVerifiedAt);
    return {
      ...clearedSale(),
      ...source,
      priceStatus: keepList ? "verified_list" : "unverified",
      priceAmount: keepList ? current.priceAmount : null,
      priceCurrency: keepList ? current.priceCurrency : null,
      priceSummary: null,
      priceVerifiedAt: keepList ? current.priceVerifiedAt : null,
      activeDeal: false,
    };
  }
  return {
    ...clearedSale(),
    ...source,
    priceStatus: "unverified" satisfies PriceStatus,
    priceAmount: null,
    priceCurrency: null,
    priceSummary: null,
    priceVerifiedAt: null,
    activeDeal: false,
  };
}

function clearedSale(): Pick<PriceFields, "saleAmount" | "saleCurrency" | "saleVerifiedAt" | "saleExpiresAt" | "saleExpiryUnknown"> {
  return {
    saleAmount: null,
    saleCurrency: null,
    saleVerifiedAt: null,
    saleExpiresAt: null,
    saleExpiryUnknown: false,
  };
}
