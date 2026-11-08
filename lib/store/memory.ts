import { randomUUID } from "crypto";
import type { EnquiryInput, Entry, LeadmailSync, SearchMiss, Signup, Sponsor, Submission } from "../types";
import type { Store } from "./types";

export function createMemoryStore(
  entries: Entry[] = [],
  seed: { sponsors?: Sponsor[]; soldSponsorIds?: string[] } = {},
): Store {
  const entryRows = entries.map((entry) => ({ ...entry, genreTags: [...entry.genreTags], priceSourceUrl: entry.priceSourceUrl ?? null }));
  const updatedAts = new Map<string, string>(entryRows.map((entry) => [entry.slug, "2026-01-01T00:00:00.000Z"]));
  const submissions: Submission[] = [];
  const signups: Signup[] = [];
  const misses: SearchMiss[] = [];
  const views = new Map<string, number>();
  const sponsors: Sponsor[] = (seed.sponsors ?? []).map((sponsor) => ({ ...sponsor }));
  const weeks: { sponsorId: string; status: string }[] = (seed.soldSponsorIds ?? []).map((sponsorId) => ({
    sponsorId,
    status: "sold",
  }));
  const clicks = new Map<string, number>();
  let enquiries = 0;
  let errors = 0;

  return {
    kind: "memory",
    async listEntries() {
      return entryRows.map((entry) => ({ ...entry, genreTags: [...entry.genreTags] }));
    },
    async getEntry(slug) {
      const found = entryRows.find((entry) => entry.slug === slug);
      return found ? { ...found, genreTags: [...found.genreTags] } : null;
    },
    async createEntry(entry) {
      entryRows.push({ ...entry, genreTags: [...entry.genreTags], priceSourceUrl: entry.priceSourceUrl ?? null });
      updatedAts.set(entry.slug, new Date().toISOString());
    },
    async updateEntryPrice(slug, fields, expectedUpdatedAt) {
      const row = entryRows.find((entry) => entry.slug === slug);
      if (!row) return { status: "missing" };
      const current = updatedAts.get(slug) ?? "2026-01-01T00:00:00.000Z";
      if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(current).getTime()) {
        return { status: "conflict" };
      }
      Object.assign(row, fields);
      const updatedAt = new Date().toISOString();
      updatedAts.set(slug, updatedAt);
      return { status: "ok", updatedAt };
    },
    async insertSubmission(input) {
      const row: Submission = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), status: "pending", reviewNote: null };
      submissions.push(row);
      return { ...row };
    },
    async listPendingSubmissions() {
      return submissions.filter((row) => row.status === "pending").map((row) => ({ ...row }));
    },
    async getSubmission(id) {
      const row = submissions.find((item) => item.id === id);
      return row ? { ...row } : null;
    },
    async reviewSubmission(id, decision) {
      const row = submissions.find((item) => item.id === id);
      if (!row || row.status !== "pending") return null;
      row.status = decision === "approve" ? "approved" : "rejected";
      return { ...row };
    },
    async insertSignup(input) {
      const row: Signup = { ...input, createdAt: new Date().toISOString(), unsubscribedAt: null };
      signups.push(row);
      return { ...row };
    },
    async getSignupByEmail(email) {
      const row = signups.find((item) => item.email === email.toLowerCase());
      return row ? { ...row } : null;
    },
    async getSignupById(id) {
      const row = signups.find((item) => item.id === id);
      return row ? { ...row } : null;
    },
    async markUnsubscribed(id, leadmailSync) {
      const row = signups.find((item) => item.id === id);
      if (!row) return;
      row.status = "unsubscribed";
      row.unsubscribedAt = new Date().toISOString();
      row.leadmailSync = leadmailSync;
    },
    async markLeadmailSync(id, leadmailSync: LeadmailSync) {
      const row = signups.find((item) => item.id === id);
      if (!row) return;
      row.leadmailSync = leadmailSync;
    },
    async logSearchMiss(query) {
      const day = new Date().toISOString().slice(0, 10);
      const existing = misses.find((item) => item.query === query && item.day === day);
      if (existing) existing.hits += 1;
      else misses.push({ query, day, hits: 1 });
    },
    async listSearchMisses() {
      return misses.map((item) => ({ ...item }));
    },
    async incrementPageview(path) {
      views.set(path, (views.get(path) ?? 0) + 1);
    },
    async pageviewTotal() {
      let total = 0;
      for (const hits of views.values()) total += hits;
      return total;
    },
    async listSponsors() {
      return sponsors.map((sponsor) => ({ ...sponsor }));
    },
    async activeSponsor() {
      const soldIds = new Set(weeks.filter((week) => week.status === "sold").map((week) => week.sponsorId));
      return sponsors.find((sponsor) => sponsor.active && soldIds.has(sponsor.id)) ?? null;
    },
    async soldWeekCount() {
      return weeks.filter((week) => week.status === "sold").length;
    },
    async sponsorClickTotal() {
      let total = 0;
      for (const hits of clicks.values()) total += hits;
      return total;
    },
    async logSponsorClick(sponsorId) {
      clicks.set(sponsorId, (clicks.get(sponsorId) ?? 0) + 1);
    },
    async insertEnquiry(_input: EnquiryInput) {
      enquiries += 1;
      return { id: randomUUID() };
    },
    async enquiryCount() {
      return enquiries;
    },
    async logError() {
      errors += 1;
    },
    async errorCount() {
      return errors;
    },
    async signupCounts() {
      return {
        pending: signups.filter((row) => row.status === "pending").length,
        unsubscribed: signups.filter((row) => row.status === "unsubscribed").length,
      };
    },
    async pendingSubmissionCount() {
      return submissions.filter((row) => row.status === "pending").length;
    },
  };
}
