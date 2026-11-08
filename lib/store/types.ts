import type { PriceFields } from "../price-update";
import type { EnquiryInput, Entry, LeadmailSync, SearchMiss, Signup, Sponsor, Submission } from "../types";

export type PriceUpdateResult =
  | { status: "ok"; updatedAt: string }
  | { status: "missing" }
  | { status: "conflict" };

export interface Store {
  kind: "memory" | "postgres" | "preview";
  listEntries(): Promise<Entry[]>;
  getEntry(slug: string): Promise<Entry | null>;
  createEntry(entry: Entry): Promise<void>;
  updateEntryPrice(slug: string, fields: PriceFields, expectedUpdatedAt: string | null): Promise<PriceUpdateResult>;
  insertSubmission(input: Omit<Submission, "id" | "createdAt" | "status" | "reviewNote">): Promise<Submission>;
  listPendingSubmissions(): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | null>;
  reviewSubmission(id: string, decision: "approve" | "reject"): Promise<Submission | null>;
  insertSignup(input: Omit<Signup, "createdAt" | "unsubscribedAt">): Promise<Signup>;
  getSignupByEmail(email: string): Promise<Signup | null>;
  getSignupById(id: string): Promise<Signup | null>;
  markUnsubscribed(id: string, leadmailSync: LeadmailSync): Promise<void>;
  markLeadmailSync(id: string, leadmailSync: LeadmailSync): Promise<void>;
  logSearchMiss(query: string): Promise<void>;
  listSearchMisses(): Promise<SearchMiss[]>;
  incrementPageview(path: string): Promise<void>;
  pageviewTotal(): Promise<number>;
  listSponsors(): Promise<Sponsor[]>;
  activeSponsor(): Promise<Sponsor | null>;
  soldWeekCount(): Promise<number>;
  sponsorClickTotal(): Promise<number>;
  logSponsorClick(sponsorId: string): Promise<void>;
  insertEnquiry(input: EnquiryInput): Promise<{ id: string }>;
  enquiryCount(): Promise<number>;
  logError(area: string, code: string, message: string): Promise<void>;
  errorCount(): Promise<number>;
  signupCounts(): Promise<{ pending: number; unsubscribed: number }>;
  pendingSubmissionCount(): Promise<number>;
}
