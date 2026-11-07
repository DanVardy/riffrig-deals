import fs from "fs";
import path from "path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(JSON.stringify({ code: "database_url_missing" }));
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "catalogue.json"), "utf8"));
if (!Array.isArray(entries) || entries.length < 30) {
  console.error(JSON.stringify({ code: "seed_catalogue_too_small", catalogueEntries: Array.isArray(entries) ? entries.length : 0 }));
  process.exit(1);
}

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
) ON CONFLICT (slug) DO NOTHING
RETURNING slug`;

function valuesFor(entry) {
  return [
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
  ];
}

await client.connect();
let exitCode = 0;
try {
  await client.query("BEGIN");
  let inserted = 0;
  for (const entry of entries) {
    const result = await client.query(sql, valuesFor(entry));
    inserted += result.rowCount ?? 0;
  }
  const slugs = entries.map((entry) => entry.slug);
  const matchedResult = await client.query("SELECT COUNT(*)::int AS n FROM entries WHERE slug = ANY($1::text[])", [slugs]);
  const databaseMatches = Number(matchedResult.rows[0]?.n ?? 0);
  if (databaseMatches !== entries.length) {
    exitCode = 1;
    await client.query("ROLLBACK");
    console.error(JSON.stringify({
      code: "seed_count_mismatch",
      inserted,
      catalogueEntries: entries.length,
      databaseMatches,
    }));
  } else {
    await client.query("COMMIT");
    console.error(JSON.stringify({
      code: "seed_applied",
      inserted,
      alreadyPresent: entries.length - inserted,
      catalogueEntries: entries.length,
      databaseMatches,
    }));
  }
} catch {
  exitCode = 1;
  try {
    await client.query("ROLLBACK");
  } catch {
    /* the connection may already be closed */
  }
  console.error(JSON.stringify({ code: "seed_failed" }));
} finally {
  await client.end();
}
process.exit(exitCode);
