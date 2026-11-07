import fs from "fs";
import path from "path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(JSON.stringify({ code: "database_url_missing" }));
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "catalogue.json"), "utf8"));
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
});

const sql = `INSERT INTO entries (
  slug, vendor, name, category, summary, official_url, genre_tags, os_formats,
  price_status, price_amount, price_currency, price_summary, price_verified_at, source_checked_at,
  source_note, sale_amount, sale_currency, sale_verified_at, sale_expires_at, sale_expiry_unknown, active_deal
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
) ON CONFLICT (slug) DO UPDATE SET
  vendor = EXCLUDED.vendor,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  summary = EXCLUDED.summary,
  official_url = EXCLUDED.official_url,
  genre_tags = EXCLUDED.genre_tags,
  os_formats = EXCLUDED.os_formats,
  price_status = EXCLUDED.price_status,
  price_amount = EXCLUDED.price_amount,
  price_currency = EXCLUDED.price_currency,
  price_summary = EXCLUDED.price_summary,
  price_verified_at = EXCLUDED.price_verified_at,
  source_checked_at = EXCLUDED.source_checked_at,
  source_note = EXCLUDED.source_note,
  sale_amount = EXCLUDED.sale_amount,
  sale_currency = EXCLUDED.sale_currency,
  sale_verified_at = EXCLUDED.sale_verified_at,
  sale_expires_at = EXCLUDED.sale_expires_at,
  sale_expiry_unknown = EXCLUDED.sale_expiry_unknown,
  active_deal = EXCLUDED.active_deal,
  updated_at = now()`;

await client.connect();
try {
  await client.query("BEGIN");
  for (const entry of entries) {
    await client.query(sql, [
      entry.slug,
      entry.vendor,
      entry.name,
      entry.category,
      entry.summary,
      entry.officialUrl,
      entry.genreTags ?? [],
      entry.osFormats,
      entry.priceStatus,
      entry.priceAmount,
      entry.priceCurrency,
      entry.priceSummary,
      entry.priceVerifiedAt,
      entry.sourceCheckedAt,
      entry.sourceNote,
      entry.saleAmount,
      entry.saleCurrency,
      entry.saleVerifiedAt,
      entry.saleExpiresAt,
      Boolean(entry.saleExpiryUnknown),
      Boolean(entry.activeDeal),
    ]);
  }
  await client.query("COMMIT");
  console.error(JSON.stringify({ code: "seed_applied", count: entries.length }));
} catch {
  await client.query("ROLLBACK");
  console.error(JSON.stringify({ code: "seed_failed" }));
  process.exitCode = 1;
} finally {
  await client.end();
}
