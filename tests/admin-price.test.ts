import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as updateRoute } from "@/app/api/admin/entries/update/route";
import { expiryLabel, isVerifiedSale, publicPrice } from "@/lib/price";
import { setStoreForTests } from "@/lib/runtime";
import { resetRateLimits } from "@/lib/rate-limit";
import { updateCataloguePrice } from "@/lib/services";
import { createMemoryStore } from "@/lib/store/memory";
import { seedEntries } from "@/lib/catalogue-data";
import type { Entry } from "@/lib/types";

const ADMIN = "admin-token-test-value";

function saleBody(overrides: Record<string, unknown> = {}) {
  return {
    slug: "reaper",
    kind: "verified_sale",
    currency: "EUR",
    saleAmount: 29.99,
    listAmount: 199.99,
    expiryUnknown: true,
    checkedAt: new Date(Date.now() - 60_000).toISOString(),
    sourceUrl: "https://example.com/reaper",
    sourceNote: "Vendor page shows EUR 29.99 and regular EUR 199.99 with no end date.",
    ...overrides,
  };
}

beforeEach(() => {
  resetRateLimits();
  setStoreForTests(null);
  process.env.ADMIN_TOKEN = ADMIN;
});

afterEach(() => {
  setStoreForTests(null);
  delete process.env.ADMIN_TOKEN;
});

describe("admin price update", () => {
  it("rejects a missing or wrong token", async () => {
    const store = createMemoryStore(seedEntries);
    setStoreForTests(store);
    const missing = await updateRoute(new Request("http://localhost:3000/api/admin/entries/update", { method: "POST", headers: { host: "localhost:3000", "content-type": "application/json" }, body: "{}" }));
    expect(missing.status).toBe(401);
    const wrong = await updateRoute(new Request("http://localhost:3000/api/admin/entries/update", {
      method: "POST",
      headers: { host: "localhost:3000", authorization: "Bearer not-the-token", "content-type": "application/json" },
      body: "{}",
    }));
    expect(wrong.status).toBe(401);
  });

  it("rejects malformed prices, future checks, and unknown slugs", async () => {
    const store = createMemoryStore(seedEntries);
    expect((await updateCataloguePrice(store, saleBody({ currency: "$" }))).status).toBe(400);
    expect((await updateCataloguePrice(store, saleBody({ saleAmount: -1 }))).status).toBe(400);
    expect((await updateCataloguePrice(store, saleBody({ checkedAt: "2099-01-01T00:00:00.000Z" }))).status).toBe(400);
    expect((await updateCataloguePrice(store, saleBody({ sourceNote: "Historic low on the vendor page today." }))).status).toBe(400);
    expect((await updateCataloguePrice(store, saleBody({ id: "nope" }))).status).toBe(400);
    expect((await updateCataloguePrice(store, saleBody({ slug: "not-a-real-plugin" }))).status).toBe(404);
    expect((await store.getEntry("reaper"))?.activeDeal).toBe(false);
  });

  it("records a verified sale with unknown expiry and a separate list price", async () => {
    const store = createMemoryStore(seedEntries);
    const nameBefore = (await store.getEntry("reaper"))?.name;
    const result = await updateCataloguePrice(store, saleBody());
    expect(result.status).toBe(200);
    const entry = (await store.getEntry("reaper")) as Entry;
    expect(entry.name).toBe(nameBefore);
    expect(entry.priceStatus).toBe("verified_sale");
    expect(entry.saleAmount).toBe(29.99);
    expect(entry.saleCurrency).toBe("EUR");
    expect(entry.priceAmount).toBe(199.99);
    expect(entry.priceCurrency).toBe("EUR");
    expect(entry.saleExpiresAt).toBeNull();
    expect(entry.saleExpiryUnknown).toBe(true);
    expect(isVerifiedSale(entry)).toBe(true);
    expect(expiryLabel(entry)).toBe("expiry unknown");
    const shown = publicPrice(entry);
    expect(shown.label).toContain("EUR");
    expect(shown.label).toContain("29.99");
    expect(shown.listLabel).toContain("199.99");
    expect(shown.checkedLabel).toContain("Checked");
    expect(shown.detail).toContain("expiry unknown");
  });

  it("keeps a normal price off the deals list", async () => {
    const store = createMemoryStore(seedEntries);
    const result = await updateCataloguePrice(store, saleBody({
      kind: "verified_list",
      saleAmount: undefined,
      listAmount: 99,
      expiryUnknown: undefined,
      sourceNote: "Vendor page shows a regular EUR 99 list price only.",
    }));
    expect(result.status).toBe(200);
    const entry = (await store.getEntry("reaper")) as Entry;
    expect(entry.priceStatus).toBe("verified_list");
    expect(entry.activeDeal).toBe(false);
    expect(entry.saleAmount).toBeNull();
    expect(isVerifiedSale(entry)).toBe(false);
    expect(publicPrice(entry).label).toContain("99");
    expect(publicPrice(entry).detail.toLowerCase()).not.toContain("sale");
  });

  it("does not let a later seed replace the admin price", async () => {
    const store = createMemoryStore(seedEntries);
    await updateCataloguePrice(store, saleBody());
    const present = new Set((await store.listEntries()).map((entry) => entry.slug));
    for (const entry of seedEntries) {
      if (!present.has(entry.slug)) await store.createEntry(entry);
    }
    const saved = await store.getEntry("reaper");
    expect(saved?.saleAmount).toBe(29.99);
    expect(saved?.activeDeal).toBe(true);
    expect(await store.signupCounts()).toEqual({ pending: 0, unsubscribed: 0 });
  });
});
