import { spawnSync } from "child_process";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { closePostgresForTests, getPostgresStore } from "@/lib/store/postgres";
import { updateCataloguePrice } from "@/lib/services";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("postgres reseed keeps admin prices", () => {
  afterAll(async () => {
    await closePostgresForTests();
  });

  it("leaves the updated price and signup rows in place", async () => {
    const first = spawnSync(process.execPath, ["scripts/release.mjs"], { env: process.env, encoding: "utf8" });
    expect(first.status).toBe(0);
    const store = getPostgresStore();
    const updated = await updateCataloguePrice(store, {
      slug: "reaper",
      kind: "verified_sale",
      currency: "USD",
      saleAmount: 49,
      listAmount: 60,
      expiryUnknown: true,
      checkedAt: new Date(Date.now() - 60_000).toISOString(),
      sourceUrl: "https://www.reaper.fm/purchase.php",
      sourceNote: "Purchase page checked for the persistence test.",
    });
    expect(updated.status).toBe(200);
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(
      `INSERT INTO signups (id, email, email_normalized, status, consent_at, consent_source, consent_text, token_hash, leadmail_sync)
       VALUES ($1, $2, $2, 'pending', now(), 'home', 'consent', 'hash', 'disabled')
       ON CONFLICT (email_normalized) DO NOTHING`,
      ["22222222-2222-4222-8222-222222222222", "ada@riff.example"],
    );
    await client.end();
    const second = spawnSync(process.execPath, ["scripts/release.mjs"], { env: process.env, encoding: "utf8" });
    expect(second.status).toBe(0);
    const entry = await store.getEntry("reaper");
    expect(entry?.saleAmount).toBe(49);
    expect(entry?.activeDeal).toBe(true);
    expect(entry?.priceStatus).toBe("verified_sale");
    const check = new pg.Client({ connectionString: databaseUrl });
    await check.connect();
    const signups = await check.query("SELECT COUNT(*)::int AS n FROM signups WHERE email_normalized = $1", ["ada@riff.example"]);
    expect(signups.rows[0]?.n).toBe(1);
    await check.end();
  });
});
