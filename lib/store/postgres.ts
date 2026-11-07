import { Pool, type QueryResultRow } from "pg";
import type { EnquiryInput, Entry, LeadmailSync, SearchMiss, Signup, Sponsor, Submission } from "../types";
import type { Category, PriceStatus } from "../types";
import type { Store } from "./types";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
      statement_timeout: 8000,
      query_timeout: 8000,
    });
    pool.on("error", () => {
      console.error(JSON.stringify({ area: "db", code: "pool_error" }));
    });
  }
  return pool;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapEntry(row: QueryResultRow): Entry {
  return {
    slug: String(row.slug),
    vendor: String(row.vendor),
    name: String(row.name),
    category: String(row.category) as Category,
    summary: String(row.summary),
    officialUrl: String(row.official_url),
    genreTags: Array.isArray(row.genre_tags) ? row.genre_tags.map(String) : [],
    osFormats: row.os_formats == null ? null : String(row.os_formats),
    priceStatus: String(row.price_status) as PriceStatus,
    priceAmount: num(row.price_amount),
    priceCurrency: row.price_currency == null ? null : String(row.price_currency),
    priceSummary: row.price_summary == null ? null : String(row.price_summary),
    priceVerifiedAt: iso(row.price_verified_at),
    sourceCheckedAt: iso(row.source_checked_at),
    sourceNote: row.source_note == null ? null : String(row.source_note),
    saleAmount: num(row.sale_amount),
    saleCurrency: row.sale_currency == null ? null : String(row.sale_currency),
    saleVerifiedAt: iso(row.sale_verified_at),
    saleExpiresAt: iso(row.sale_expires_at),
    saleExpiryUnknown: Boolean(row.sale_expiry_unknown),
    activeDeal: Boolean(row.active_deal),
  };
}

function mapSubmission(row: QueryResultRow): Submission {
  return {
    id: String(row.id),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    status: String(row.status) as Submission["status"],
    vendor: String(row.vendor),
    name: String(row.name),
    category: String(row.category) as Category,
    officialUrl: String(row.official_url),
    note: String(row.note ?? ""),
    reviewNote: row.review_note == null ? null : String(row.review_note),
  };
}

function mapSignup(row: QueryResultRow): Signup {
  return {
    id: String(row.id),
    email: String(row.email_normalized),
    status: String(row.status) as Signup["status"],
    consentAt: iso(row.consent_at) ?? new Date(0).toISOString(),
    consentSource: String(row.consent_source) as Signup["consentSource"],
    consentText: String(row.consent_text),
    tokenHash: String(row.token_hash),
    leadmailSync: String(row.leadmail_sync) as LeadmailSync,
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    unsubscribedAt: iso(row.unsubscribed_at),
  };
}

function mapSponsor(row: QueryResultRow): Sponsor {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    destinationUrl: String(row.destination_url),
    active: Boolean(row.active),
  };
}

const ENTRY_COLUMNS = `slug, vendor, name, category, summary, official_url, genre_tags, os_formats,
  price_status, price_amount, price_currency, price_summary, price_verified_at, source_checked_at,
  source_note, sale_amount, sale_currency, sale_verified_at, sale_expires_at, sale_expiry_unknown, active_deal`;

export function getPostgresStore(): Store {
  const db = getPool();
  return {
    kind: "postgres",
    async listEntries() {
      const result = await db.query(
        `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY lower(regexp_replace(name, '^[^[:alnum:]]+', '')) ASC, name ASC`,
      );
      return result.rows.map(mapEntry);
    },
    async getEntry(slug) {
      const result = await db.query(`SELECT ${ENTRY_COLUMNS} FROM entries WHERE slug = $1`, [slug]);
      return result.rows[0] ? mapEntry(result.rows[0]) : null;
    },
    async createEntry(entry) {
      await db.query(
        `INSERT INTO entries (${ENTRY_COLUMNS})
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          entry.slug,
          entry.vendor,
          entry.name,
          entry.category,
          entry.summary,
          entry.officialUrl,
          entry.genreTags,
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
          entry.saleExpiryUnknown,
          entry.activeDeal,
        ],
      );
    },
    async insertSubmission(input) {
      const result = await db.query(
        `INSERT INTO submissions (vendor, name, category, official_url, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at, status, vendor, name, category, official_url, note, review_note`,
        [input.vendor, input.name, input.category, input.officialUrl, input.note],
      );
      return mapSubmission(result.rows[0]);
    },
    async listPendingSubmissions() {
      const result = await db.query(
        `SELECT id, created_at, status, vendor, name, category, official_url, note, review_note
         FROM submissions WHERE status = 'pending' ORDER BY created_at ASC`,
      );
      return result.rows.map(mapSubmission);
    },
    async getSubmission(id) {
      const result = await db.query(
        `SELECT id, created_at, status, vendor, name, category, official_url, note, review_note
         FROM submissions WHERE id = $1`,
        [id],
      );
      return result.rows[0] ? mapSubmission(result.rows[0]) : null;
    },
    async reviewSubmission(id, decision) {
      const status = decision === "approve" ? "approved" : "rejected";
      const result = await db.query(
        `UPDATE submissions
         SET status = $2, reviewed_at = now()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, created_at, status, vendor, name, category, official_url, note, review_note`,
        [id, status],
      );
      return result.rows[0] ? mapSubmission(result.rows[0]) : null;
    },
    async insertSignup(input) {
      const result = await db.query(
        `INSERT INTO signups
         (id, email, email_normalized, status, consent_at, consent_source, consent_text, token_hash, leadmail_sync)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email_normalized, status, consent_at, consent_source, consent_text, token_hash, leadmail_sync, created_at, unsubscribed_at`,
        [
          input.id,
          input.email,
          input.email,
          input.status,
          input.consentAt,
          input.consentSource,
          input.consentText,
          input.tokenHash,
          input.leadmailSync,
        ],
      );
      return mapSignup(result.rows[0]);
    },
    async getSignupByEmail(email) {
      const result = await db.query(
        `SELECT id, email_normalized, status, consent_at, consent_source, consent_text, token_hash, leadmail_sync, created_at, unsubscribed_at
         FROM signups WHERE email_normalized = $1`,
        [email.toLowerCase()],
      );
      return result.rows[0] ? mapSignup(result.rows[0]) : null;
    },
    async getSignupById(id) {
      const result = await db.query(
        `SELECT id, email_normalized, status, consent_at, consent_source, consent_text, token_hash, leadmail_sync, created_at, unsubscribed_at
         FROM signups WHERE id = $1`,
        [id],
      );
      return result.rows[0] ? mapSignup(result.rows[0]) : null;
    },
    async markUnsubscribed(id, leadmailSync) {
      await db.query(
        `UPDATE signups
         SET status = 'unsubscribed', unsubscribed_at = now(), leadmail_sync = $2, updated_at = now()
         WHERE id = $1`,
        [id, leadmailSync],
      );
    },
    async markLeadmailSync(id, leadmailSync) {
      await db.query(`UPDATE signups SET leadmail_sync = $2, updated_at = now() WHERE id = $1`, [id, leadmailSync]);
    },
    async logSearchMiss(query) {
      await db.query(
        `INSERT INTO search_misses (query_norm, day, hits)
         VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (query_norm, day) DO UPDATE SET hits = search_misses.hits + 1`,
        [query],
      );
    },
    async listSearchMisses() {
      const result = await db.query(
        `SELECT query_norm, day, hits FROM search_misses ORDER BY hits DESC, query_norm ASC LIMIT 100`,
      );
      return result.rows.map(
        (row): SearchMiss => ({
          query: String(row.query_norm),
          day: iso(row.day)?.slice(0, 10) ?? "",
          hits: Number(row.hits),
        }),
      );
    },
    async incrementPageview(path) {
      await db.query(
        `INSERT INTO pageviews (path, viewed_on, hits)
         VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (path, viewed_on) DO UPDATE SET hits = pageviews.hits + 1`,
        [path],
      );
    },
    async pageviewTotal() {
      const result = await db.query(`SELECT COALESCE(SUM(hits), 0)::int AS total FROM pageviews`);
      return Number(result.rows[0]?.total ?? 0);
    },
    async listSponsors() {
      const result = await db.query(`SELECT id, slug, name, destination_url, active FROM sponsors ORDER BY name ASC`);
      return result.rows.map(mapSponsor);
    },
    async activeSponsor() {
      const result = await db.query(
        `SELECT s.id, s.slug, s.name, s.destination_url, s.active
         FROM sponsors s
         JOIN sponsor_weeks w ON w.sponsor_id = s.id
         WHERE s.active = true
           AND w.status = 'sold'
           AND w.week_start <= CURRENT_DATE
           AND w.week_start + 7 > CURRENT_DATE
         ORDER BY w.week_start DESC
         LIMIT 1`,
      );
      return result.rows[0] ? mapSponsor(result.rows[0]) : null;
    },
    async soldWeekCount() {
      const result = await db.query(`SELECT COUNT(*)::int AS total FROM sponsor_weeks WHERE status = 'sold'`);
      return Number(result.rows[0]?.total ?? 0);
    },
    async sponsorClickTotal() {
      const result = await db.query(`SELECT COALESCE(SUM(hits), 0)::int AS total FROM sponsor_clicks`);
      return Number(result.rows[0]?.total ?? 0);
    },
    async logSponsorClick(sponsorId) {
      await db.query(
        `INSERT INTO sponsor_clicks (sponsor_id, clicked_on, hits)
         VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (sponsor_id, clicked_on) DO UPDATE SET hits = sponsor_clicks.hits + 1`,
        [sponsorId],
      );
    },
    async insertEnquiry(input: EnquiryInput) {
      const result = await db.query(
        `INSERT INTO enquiries (name, email, organisation, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [input.name, input.email, input.organisation || null, input.message],
      );
      return { id: String(result.rows[0]?.id) };
    },
    async enquiryCount() {
      const result = await db.query(`SELECT COUNT(*)::int AS total FROM enquiries`);
      return Number(result.rows[0]?.total ?? 0);
    },
    async logError(area, code, message) {
      await db.query(`INSERT INTO app_errors (area, code, message) VALUES ($1, $2, $3)`, [area, code, message]);
    },
    async errorCount() {
      const result = await db.query(`SELECT COUNT(*)::int AS total FROM app_errors`);
      return Number(result.rows[0]?.total ?? 0);
    },
    async signupCounts() {
      const result = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
           COUNT(*) FILTER (WHERE status = 'unsubscribed')::int AS unsubscribed
         FROM signups`,
      );
      return {
        pending: Number(result.rows[0]?.pending ?? 0),
        unsubscribed: Number(result.rows[0]?.unsubscribed ?? 0),
      };
    },
    async pendingSubmissionCount() {
      const result = await db.query(`SELECT COUNT(*)::int AS total FROM submissions WHERE status = 'pending'`);
      return Number(result.rows[0]?.total ?? 0);
    },
  };
}
