import { readFileSync } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requireAdmin } from "@/lib/admin-auth";
import { healthDecision } from "@/lib/health";
import { LeadmailClient, leadmailIsEnabled, readLeadmailConfig } from "@/lib/leadmail";
import { resetRateLimits, rateLimit } from "@/lib/rate-limit";
import { setStoreForTests } from "@/lib/runtime";
import { safeSponsorRedirect } from "@/lib/redirects";
import { createMemoryStore } from "@/lib/store/memory";
import {
  adminStats,
  createEnquiry,
  createSignup,
  createSubmission,
  decideSubmission,
  recordSearchMiss,
  unsubscribeWithToken,
} from "@/lib/services";
import { createUnsubscribeToken } from "@/lib/tokens";
import { GET as go } from "@/app/go/[slug]/route";
import { POST as signupRoute } from "@/app/api/newsletter/signup/route";
import { GET as queueRoute } from "@/app/api/admin/queue/route";
import { NextRequest } from "next/server";
import { blockedBody, productionBlocked } from "@/lib/production-gate.mjs";

const SECRET = "unsubscribe-secret-test-value";
const ADMIN = "admin-token-test-value";

const previous = {
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
  LEADMAIL_API_BASE: process.env.LEADMAIL_API_BASE,
  LEADMAIL_API_KEY: process.env.LEADMAIL_API_KEY,
  LEADMAIL_LIST_ID: process.env.LEADMAIL_LIST_ID,
  LEADMAIL_SENDING_VERIFIED: process.env.LEADMAIL_SENDING_VERIFIED,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PHASE: process.env.NEXT_PHASE,
};

beforeEach(() => {
  resetRateLimits();
  setStoreForTests(null);
  process.env.UNSUBSCRIBE_SECRET = SECRET;
  delete process.env.ADMIN_TOKEN;
  delete process.env.LEADMAIL_API_BASE;
  delete process.env.LEADMAIL_API_KEY;
  delete process.env.LEADMAIL_LIST_ID;
  delete process.env.LEADMAIL_SENDING_VERIFIED;
  delete process.env.DATABASE_URL;
});

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

afterEach(() => {
  setStoreForTests(null);
  for (const [key, value] of Object.entries(previous)) setEnv(key, value);
});

function enableLeadmail() {
  process.env.LEADMAIL_API_BASE = "https://mail.example";
  process.env.LEADMAIL_API_KEY = "org-key-test";
  process.env.LEADMAIL_LIST_ID = "list-1";
  process.env.LEADMAIL_SENDING_VERIFIED = "true";
}

describe("admin auth", () => {
  it("fails closed without a server token and ignores a public token", () => {
    process.env.NEXT_PUBLIC_ADMIN_TOKEN = ADMIN;
    expect(requireAdmin(new Request("http://localhost/api/admin/queue"))?.status).toBe(503);
    delete process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "short";
    expect(requireAdmin(new Request("http://localhost/api/admin/queue", { headers: { authorization: "Bearer short" } }))?.status).toBe(503);
    process.env.ADMIN_TOKEN = ADMIN;
    expect(requireAdmin(new Request("http://localhost/api/admin/queue"))?.status).toBe(401);
    expect(requireAdmin(new Request("http://localhost/api/admin/queue", { headers: { authorization: "Bearer wrong-token-value" } }))?.status).toBe(401);
    expect(requireAdmin(new Request("http://localhost/api/admin/queue", { headers: { authorization: `Bearer ${ADMIN}` } }))).toBeNull();
    expect(
      requireAdmin(new Request(`http://localhost/api/admin/queue?token=${ADMIN}`, { headers: { authorization: `Bearer ${ADMIN}` } }))?.status,
    ).toBe(401);
  });

  it("protects the queue route", async () => {
    process.env.ADMIN_TOKEN = ADMIN;
    const store = createMemoryStore();
    setStoreForTests(store);
    const denied = await queueRoute(new Request("http://localhost:3000/api/admin/queue", { headers: { host: "localhost:3000" } }));
    expect(denied.status).toBe(401);
    const allowed = await queueRoute(
      new Request("http://localhost:3000/api/admin/queue", {
        headers: { host: "localhost:3000", authorization: `Bearer ${ADMIN}` },
      }),
    );
    expect(allowed.status).toBe(200);
    const body = await allowed.json();
    expect(body.submissions).toEqual([]);
    expect(JSON.stringify(body).includes("@")).toBe(false);
  });
});

describe("mutations", () => {
  it("rejects invalid submissions and does not pretend a preview save worked", async () => {
    const store = createMemoryStore();
    expect((await createSubmission(store, { vendor: "A", name: "B", category: "amp-sim", officialUrl: "http://vendor.example/a" })).status).toBe(400);
    expect((await createSubmission(store, { vendor: "Acme", name: "Plugin", category: "amp-sim", officialUrl: "javascript:alert(1)" })).status).toBe(400);
    const tripped = await createSubmission(store, {
      vendor: "Acme",
      name: "Plugin",
      category: "amp-sim",
      officialUrl: "https://vendor.example/plugin",
      company_url: "https://spam.example",
    });
    expect(tripped.status).toBe(400);
    expect(await store.pendingSubmissionCount()).toBe(0);
    const saved = await createSubmission(store, {
      vendor: "Acme",
      name: "Plugin",
      category: "effects",
      officialUrl: "https://vendor.example/plugin",
      note: "50% off ends Friday",
    });
    expect(saved.body.persisted).toBe(true);
    const approved = await decideSubmission(store, { id: (await store.listPendingSubmissions())[0]?.id, decision: "approve" });
    expect(approved.body.activeDeal).toBe(false);
    const entry = await store.getEntry(String(approved.body.slug));
    expect(entry?.priceStatus).toBe("unverified");
    expect(entry?.summary.includes("50%")).toBe(false);
    const preview = await signupRoute(
      new Request("http://localhost:3000/api/newsletter/signup", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", host: "localhost:3000" },
        body: JSON.stringify({ email: "ada@riff.example", consent: true, source: "home" }),
      }),
    );
    expect(preview.status).toBe(503);
    const previewBody = await preview.json();
    expect(previewBody.persisted).toBe(false);
  });

  it("stores consent, refuses arbitrary unsubscribe, and will not resubscribe", async () => {
    const fetchImpl = (() => {
      throw new Error("leadmail should stay disabled");
    }) as typeof fetch;
    const store = createMemoryStore();
    expect((await createSignup(store, { email: "not-an-email", consent: true, source: "home" })).status).toBe(400);
    expect((await createSignup(store, { email: "ada@riff.example", consent: false, source: "home" })).status).toBe(400);
    const created = await createSignup(store, { email: "Ada@Riff.example", consent: "yes", source: "newsletter" }, fetchImpl);
    expect(created.status).toBe(200);
    expect(created.body.status).toBe("pending");
    expect(created.body.sending).toBe("not_active");
    expect(String(created.body.message).toLowerCase().includes("subscribed")).toBe(false);
    const path = String(created.body.unsubscribePath);
    const token = new URL(`http://localhost${path}`).searchParams.get("token") ?? "";
    const other = await createSignup(store, { email: "bo@riff.example", consent: true, source: "home" }, fetchImpl);
    const otherToken = new URL(`http://localhost${String(other.body.unsubscribePath)}`).searchParams.get("token") ?? "";
    expect((await unsubscribeWithToken(store, { email: "ada@riff.example" })).status).toBe(400);
    expect((await unsubscribeWithToken(store, { token: createUnsubscribeToken(crypto.randomUUID(), SECRET) })).status).toBe(400);
    const removed = await unsubscribeWithToken(store, { token, email: "bo@riff.example" }, fetchImpl);
    expect(removed.body.status).toBe("unsubscribed");
    expect((await store.getSignupByEmail("ada@riff.example"))?.status).toBe("unsubscribed");
    expect((await store.getSignupByEmail("bo@riff.example"))?.status).toBe("pending");
    const again = await createSignup(store, { email: "ada@riff.example", consent: true, source: "home" }, fetchImpl);
    expect(again.status).toBe(409);
    expect((await store.getSignupByEmail("ada@riff.example"))?.status).toBe("unsubscribed");
    expect((await unsubscribeWithToken(store, { token: otherToken })).body.status).toBe("unsubscribed");
    const stats = await adminStats(store);
    expect(stats.signupsUnsubscribed).toBe(2);
    expect(JSON.stringify(stats).includes("@")).toBe(false);
    const missed = await recordSearchMiss(store, { query: "ada@riff.example" });
    expect(missed.body.logged).toBe(false);
    expect(await store.listSearchMisses()).toEqual([]);
    expect((await createEnquiry(store, { name: "A", email: "ada@riff.example", message: "short" })).status).toBe(400);
    const enquiry = await createEnquiry(store, {
      name: "Ada",
      email: "ada@riff.example",
      message: "Interested in one introductory week on the site.",
    });
    expect(enquiry.body.message).toBe("Saved. Nothing was emailed.");
  });

  it("records a provider failure without calling a disabled adapter", async () => {
    const store = createMemoryStore();
    const calls: string[] = [];
    const failingFetch = (async (url: string) => {
      calls.push(String(url));
      return new Response("no", { status: 500 });
    }) as typeof fetch;
    enableLeadmail();
    const failed = await createSignup(store, { email: "cy@riff.example", consent: true, source: "home" }, failingFetch);
    expect(failed.status).toBe(202);
    expect(failed.body.persisted).toBe(true);
    expect(failed.body.provider).toBe("failed");
    expect(String(failed.body.message).toLowerCase().includes("subscribed")).toBe(false);
    expect(calls.some((url) => url.endsWith("/api/contacts/create"))).toBe(true);
    expect((await store.getSignupByEmail("cy@riff.example"))?.leadmailSync).toBe("failed");
    delete process.env.LEADMAIL_SENDING_VERIFIED;
    const quiet = createMemoryStore();
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("ok");
    }) as typeof fetch;
    const disabled = await createSignup(quiet, { email: "dee@riff.example", consent: true, source: "home" }, spy);
    expect(disabled.body.provider).toBe("disabled");
    expect(called).toBe(false);
    expect(
      leadmailIsEnabled(
        readLeadmailConfig({
          NODE_ENV: "test",
          LEADMAIL_API_BASE: "https:///api",
          LEADMAIL_API_KEY: "x",
          LEADMAIL_LIST_ID: "y",
          LEADMAIL_SENDING_VERIFIED: "true",
        }),
      ),
    ).toBe(false);
    const client = new LeadmailClient(readLeadmailConfig(), spy);
    await expect(client.createContact("dee@riff.example")).rejects.toThrow(/leadmail_disabled/);
  });
});

describe("redirects and production gate", () => {
  it("redirects only to the stored https sponsor and logs the click", async () => {
    expect(safeSponsorRedirect("javascript:alert(1)")).toBeNull();
    expect(safeSponsorRedirect("http://sponsor.example/deal")).toBeNull();
    const store = createMemoryStore([], {
      sponsors: [{ id: "11111111-1111-1111-1111-111111111111", slug: "amp-co", name: "Amp Co", destinationUrl: "https://sponsor.example/deal", active: true }],
      soldSponsorIds: ["11111111-1111-1111-1111-111111111111"],
    });
    setStoreForTests(store);
    const response = await go(
      new NextRequest("http://localhost:3000/go/amp-co?url=https://evil.example"),
      { params: Promise.resolve({ slug: "amp-co" }) },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://sponsor.example/deal");
    expect(await store.sponsorClickTotal()).toBe(1);
    const missing = await go(new NextRequest("http://localhost:3000/go/nope"), { params: Promise.resolve({ slug: "nope" }) });
    expect(missing.status).toBe(404);
  });

  it("fails closed in production when the database is missing", () => {
    expect(healthDecision({ NODE_ENV: "production" }).status).toBe(503);
    expect(healthDecision({ NODE_ENV: "development" }).body.persistence).toBe("preview");
    expect(productionBlocked({ NODE_ENV: "production" })).toBe(true);
    expect(productionBlocked({ NODE_ENV: "production", DATABASE_URL: "postgres://db" })).toBe(false);
    expect(productionBlocked({ NODE_ENV: "development" })).toBe(false);
    expect(blockedBody("/api/health")).toEqual({ ok: false, ready: false });
    expect(blockedBody("/api/newsletter/signup")?.persisted).toBe(false);
    expect(blockedBody("/deals")).toBeNull();
  });

  it("keeps SQL parameters bound", () => {
    const source = readFileSync("lib/store/postgres.ts", "utf8");
    const expressions = source.match(/\$\{[^}]+\}/g) ?? [];
    expect(expressions.every((item) => item === "${ENTRY_COLUMNS}")).toBe(true);
    expect(source.includes("$1")).toBe(true);
    const migration = readFileSync("db/migrations/001_init.sql", "utf8");
    for (const table of ["entries", "submissions", "signups", "search_misses", "pageviews", "sponsors", "sponsor_weeks", "sponsor_clicks", "enquiries", "app_errors"]) {
      expect(migration.includes(table)).toBe(true);
    }
  });

  it("rate limits a bucket", () => {
    expect(rateLimit("ip", 2, 1000, 0)).toBe(true);
    expect(rateLimit("ip", 2, 1000, 0)).toBe(true);
    expect(rateLimit("ip", 2, 1000, 0)).toBe(false);
  });
});
