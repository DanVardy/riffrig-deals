import { PersistenceUnavailable } from "../errors";
import { seedEntries } from "../catalogue-data";
import type { Entry } from "../types";
import type { Store } from "./types";

function refuse(): never {
  throw new PersistenceUnavailable();
}

export const previewStore: Store = {
  kind: "preview",
  async listEntries() {
    return seedEntries;
  },
  async getEntry(slug: string) {
    return seedEntries.find((entry) => entry.slug === slug) ?? null;
  },
  async createEntry() {
    refuse();
  },
  async insertSubmission() {
    refuse();
  },
  async listPendingSubmissions() {
    refuse();
  },
  async getSubmission() {
    refuse();
  },
  async reviewSubmission() {
    refuse();
  },
  async insertSignup() {
    refuse();
  },
  async getSignupByEmail() {
    refuse();
  },
  async getSignupById() {
    refuse();
  },
  async markUnsubscribed() {
    refuse();
  },
  async markLeadmailSync() {
    refuse();
  },
  async logSearchMiss() {
    refuse();
  },
  async listSearchMisses() {
    refuse();
  },
  async incrementPageview() {
    refuse();
  },
  async pageviewTotal() {
    refuse();
  },
  async listSponsors() {
    refuse();
  },
  async activeSponsor() {
    return null;
  },
  async soldWeekCount() {
    refuse();
  },
  async sponsorClickTotal() {
    refuse();
  },
  async logSponsorClick() {
    refuse();
  },
  async insertEnquiry() {
    refuse();
  },
  async enquiryCount() {
    refuse();
  },
  async logError() {
    refuse();
  },
  async errorCount() {
    refuse();
  },
  async signupCounts() {
    refuse();
  },
  async pendingSubmissionCount() {
    refuse();
  },
};

export function cloneEntry(entry: Entry): Entry {
  return { ...entry, genreTags: [...entry.genreTags] };
}
