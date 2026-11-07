import { randomUUID } from "crypto";
import { PersistenceUnavailable } from "./errors";
import { LeadmailClient, readLeadmailConfig } from "./leadmail";
import { notPersisted } from "./runtime";
import type { Store } from "./store/types";
import { createUnsubscribeToken, hashToken, hashesMatch, unsubscribeSecret, verifyUnsubscribeToken } from "./tokens";
import { CONSENT_TEXT, type Category, type Entry } from "./types";
import {
  decisionSchema,
  enquirySchema,
  honeypotTripped,
  httpsPublicUrl,
  normalisePagePath,
  normaliseSearchQuery,
  pageviewSchema,
  searchMissSchema,
  signupSchema,
  submissionSchema,
  unsubscribeSchema,
} from "./validate";

export type ActionResult = { status: number; body: Record<string, unknown> };

const EDITOR_SUMMARY =
  "Added from the submission queue. An editor has not verified a price or written a catalogue description.";

function unavailable(error: unknown): ActionResult | null {
  if (error instanceof PersistenceUnavailable) return notPersisted();
  return null;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "entry";
}

async function uniqueSlug(store: Store, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; n < 30; n += 1) {
    if (!(await store.getEntry(slug))) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function createSubmission(store: Store, raw: unknown): Promise<ActionResult> {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { ok: false, persisted: false, error: "invalid" } };
  if (honeypotTripped(parsed.data.company_url)) {
    return { status: 400, body: { ok: false, persisted: false, error: "rejected" } };
  }
  try {
    const row = await store.insertSubmission({
      vendor: parsed.data.vendor,
      name: parsed.data.name,
      category: parsed.data.category,
      officialUrl: parsed.data.officialUrl,
      note: parsed.data.note,
    });
    return {
      status: 200,
      body: {
        ok: true,
        persisted: true,
        id: row.id,
        message: "Saved for review. It stays off the catalogue until an editor approves it, and a claimed price is not published.",
      },
    };
  } catch (error) {
    const closed = unavailable(error);
    if (closed) return closed;
    throw error;
  }
}

export async function createEnquiry(store: Store, raw: unknown): Promise<ActionResult> {
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { ok: false, persisted: false, error: "invalid" } };
  if (honeypotTripped(parsed.data.company_url)) {
    return { status: 400, body: { ok: false, persisted: false, error: "rejected" } };
  }
  try {
    await store.insertEnquiry({
      name: parsed.data.name,
      email: parsed.data.email,
      organisation: parsed.data.organisation,
      message: parsed.data.message,
    });
    return {
      status: 200,
      body: { ok: true, persisted: true, message: "Saved. Nothing was emailed." },
    };
  } catch (error) {
    const closed = unavailable(error);
    if (closed) return closed;
    throw error;
  }
}

export async function createSignup(
  store: Store,
  raw: unknown,
  fetchImpl?: typeof fetch,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { ok: false, persisted: false, error: "invalid" } };
  if (honeypotTripped(parsed.data.company_url)) {
    return { status: 400, body: { ok: false, persisted: false, error: "rejected" } };
  }
  const secret = unsubscribeSecret();
  if (!secret) {
    return {
      status: 503,
      body: { ok: false, persisted: false, error: "not_configured", message: "Not saved. Signup is not configured, and no email was sent." },
    };
  }
  try {
    const existing = await store.getSignupByEmail(parsed.data.email);
    if (existing?.status === "unsubscribed") {
      return {
        status: 409,
        body: {
          ok: false,
          persisted: false,
          error: "suppressed",
          message: "This address is unsubscribed and will not be added again automatically. No email was sent.",
        },
      };
    }
    if (existing?.status === "pending") {
      return {
        status: 200,
        body: {
          ok: true,
          persisted: true,
          already: true,
          status: "pending",
          sending: "not_active",
          message: "This address is already a pending signup. No new link was issued and no email was sent.",
        },
      };
    }
    const id = randomUUID();
    const token = createUnsubscribeToken(id, secret);
    const signup = await store.insertSignup({
      id,
      email: parsed.data.email,
      status: "pending",
      consentAt: new Date().toISOString(),
      consentSource: parsed.data.source,
      consentText: CONSENT_TEXT,
      tokenHash: hashToken(token),
      leadmailSync: "not_attempted",
    });
    const provider = await syncContact(store, signup.email, signup.id, fetchImpl, "create");
    return {
      status: provider === "failed" ? 202 : 200,
      body: {
        ok: true,
        persisted: true,
        status: "pending",
        sending: "not_active",
        provider,
        unsubscribePath: `/unsubscribe?token=${encodeURIComponent(token)}`,
        message: signupMessage(provider),
      },
    };
  } catch (error) {
    const closed = unavailable(error);
    if (closed) return closed;
    throw error;
  }
}

function signupMessage(provider: "disabled" | "failed" | "synced"): string {
  if (provider === "failed") {
    return "Saved as a pending signup. The email provider could not be updated, and no Friday letter was sent.";
  }
  if (provider === "synced") {
    return "Saved as a pending signup. The provider contact record was updated, and no Friday letter was sent.";
  }
  return "Saved with your consent. You will not be emailed until sending is confirmed. No message was sent.";
}

async function syncContact(
  store: Store,
  email: string,
  id: string,
  fetchImpl: typeof fetch | undefined,
  mode: "create" | "remove",
): Promise<"disabled" | "failed" | "synced"> {
  const client = new LeadmailClient(readLeadmailConfig(), fetchImpl);
  if (!client.isEnabled()) {
    await store.markLeadmailSync(id, "disabled");
    return "disabled";
  }
  try {
    if (mode === "create") {
      await client.createContact(email);
      await client.addToList(email);
    } else {
      await client.removeFromAll(email);
      await client.unsubscribe(email);
    }
    await store.markLeadmailSync(id, "synced");
    return "synced";
  } catch {
    await store.markLeadmailSync(id, "failed");
    try {
      await store.logError("leadmail", mode === "create" ? "signup_sync_failed" : "unsubscribe_failed", "Leadmail request failed");
    } catch {
      /* error logging must not undo the signup or unsubscribe */
    }
    return "failed";
  }
}

export async function unsubscribeWithToken(
  store: Store,
  raw: unknown,
  fetchImpl?: typeof fetch,
): Promise<ActionResult> {
  const parsed = unsubscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 400, body: { ok: false, error: "invalid", message: "This unsubscribe link is not valid." } };
  }
  const secret = unsubscribeSecret();
  if (!secret) {
    return { status: 503, body: { ok: false, persisted: false, error: "not_configured", message: "Unsubscribe is not configured." } };
  }
  const id = verifyUnsubscribeToken(parsed.data.token, secret);
  if (!id) return { status: 400, body: { ok: false, error: "invalid", message: "This unsubscribe link is not valid." } };
  try {
    const row = await store.getSignupById(id);
    if (!row || !hashesMatch(hashToken(parsed.data.token), row.tokenHash)) {
      return { status: 400, body: { ok: false, error: "invalid", message: "This unsubscribe link is not valid." } };
    }
    if (row.status === "unsubscribed") {
      return {
        status: 200,
        body: { ok: true, persisted: true, status: "unsubscribed", already: true, message: "This address is already unsubscribed." },
      };
    }
    await store.markUnsubscribed(id, "not_attempted");
    const provider = await syncContact(store, row.email, id, fetchImpl, "remove");
    const extra = provider === "failed" ? " The email provider could not be updated." : "";
    return {
      status: 200,
      body: {
        ok: true,
        persisted: true,
        status: "unsubscribed",
        provider,
        message: `Unsubscribed. This address will not be added again automatically.${extra}`,
      },
    };
  } catch (error) {
    const closed = unavailable(error);
    if (closed) return closed;
    throw error;
  }
}

export async function decideSubmission(store: Store, raw: unknown): Promise<ActionResult> {
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { ok: false, error: "invalid" } };
  const current = await store.getSubmission(parsed.data.id);
  if (!current || current.status !== "pending") return { status: 404, body: { ok: false, error: "not_found" } };
  if (!httpsPublicUrl(current.officialUrl)) return { status: 400, body: { ok: false, error: "invalid" } };
  if (parsed.data.decision === "reject") {
    const updated = await store.reviewSubmission(current.id, "reject");
    if (!updated) return { status: 404, body: { ok: false, error: "not_found" } };
    return { status: 200, body: { ok: true, status: "rejected" } };
  }
  const slug = await uniqueSlug(store, current.name);
  const entry: Entry = {
    slug,
    vendor: current.vendor,
    name: current.name,
    category: current.category as Category,
    summary: EDITOR_SUMMARY,
    officialUrl: current.officialUrl,
    genreTags: [],
    osFormats: null,
    priceStatus: "unverified",
    priceAmount: null,
    priceCurrency: null,
    priceSummary: null,
    priceVerifiedAt: null,
    sourceCheckedAt: null,
    sourceNote: "Approved from the queue without a price check.",
    saleAmount: null,
    saleCurrency: null,
    saleVerifiedAt: null,
    saleExpiresAt: null,
    saleExpiryUnknown: false,
    activeDeal: false,
  };
  await store.createEntry(entry);
  const updated = await store.reviewSubmission(current.id, "approve");
  if (!updated) return { status: 404, body: { ok: false, error: "not_found" } };
  return { status: 200, body: { ok: true, status: "approved", slug, activeDeal: false } };
}

export async function adminStats(store: Store): Promise<Record<string, number>> {
  const [entries, pendingSubmissions, signups, misses, pageviews, sponsorClicks, soldSponsorWeeks, enquiries, errors] =
    await Promise.all([
      store.listEntries(),
      store.pendingSubmissionCount(),
      store.signupCounts(),
      store.listSearchMisses(),
      store.pageviewTotal(),
      store.sponsorClickTotal(),
      store.soldWeekCount(),
      store.enquiryCount(),
      store.errorCount(),
    ]);
  return {
    entries: entries.length,
    pendingSubmissions,
    signupsPending: signups.pending,
    signupsUnsubscribed: signups.unsubscribed,
    searchMisses: misses.reduce((sum, row) => sum + row.hits, 0),
    pageviews,
    sponsorClicks,
    soldSponsorWeeks,
    enquiries,
    errors,
  };
}

export async function recordSearchMiss(store: Store, raw: unknown): Promise<ActionResult> {
  const parsed = searchMissSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { logged: false, persisted: false, error: "invalid" } };
  const query = normaliseSearchQuery(parsed.data.query);
  if (!query) return { status: 200, body: { logged: false, persisted: false } };
  try {
    await store.logSearchMiss(query);
    return { status: 200, body: { logged: true, persisted: true } };
  } catch (error) {
    if (error instanceof PersistenceUnavailable) return { status: 200, body: { logged: false, persisted: false } };
    throw error;
  }
}

export async function recordPageview(store: Store, raw: unknown): Promise<ActionResult> {
  const parsed = pageviewSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { logged: false, persisted: false, error: "invalid" } };
  const path = normalisePagePath(parsed.data.path);
  if (!path) return { status: 200, body: { logged: false, persisted: false } };
  try {
    await store.incrementPageview(path);
    return { status: 200, body: { logged: true, persisted: true } };
  } catch (error) {
    if (error instanceof PersistenceUnavailable) return { status: 200, body: { logged: false, persisted: false } };
    throw error;
  }
}
