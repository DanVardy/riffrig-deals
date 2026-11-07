export const CATEGORIES = ["amp-sim", "effects", "cabinet-ir", "recording", "amp-capture"] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  "amp-sim": "Amp sim",
  effects: "Effects",
  "cabinet-ir": "Cabinet IR",
  recording: "Recording",
  "amp-capture": "Amp capture",
};

export type PriceStatus = "unverified" | "verified_free" | "verified_list" | "verified_sale";

export type Entry = {
  slug: string;
  vendor: string;
  name: string;
  category: Category;
  summary: string;
  officialUrl: string;
  genreTags: string[];
  osFormats: string | null;
  priceStatus: PriceStatus;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceSummary: string | null;
  priceVerifiedAt: string | null;
  sourceCheckedAt: string | null;
  sourceNote: string | null;
  saleAmount: number | null;
  saleCurrency: string | null;
  saleVerifiedAt: string | null;
  saleExpiresAt: string | null;
  saleExpiryUnknown: boolean;
  activeDeal: boolean;
};

export type Submission = {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  vendor: string;
  name: string;
  category: Category;
  officialUrl: string;
  note: string;
  reviewNote: string | null;
};

export type SignupStatus = "pending" | "unsubscribed";
export type LeadmailSync = "not_attempted" | "disabled" | "failed" | "synced";

export type Signup = {
  id: string;
  email: string;
  status: SignupStatus;
  consentAt: string;
  consentSource: "home" | "newsletter";
  consentText: string;
  tokenHash: string;
  leadmailSync: LeadmailSync;
  createdAt: string;
  unsubscribedAt: string | null;
};

export type Sponsor = {
  id: string;
  slug: string;
  name: string;
  destinationUrl: string;
  active: boolean;
};

export type SearchMiss = {
  query: string;
  day: string;
  hits: number;
};

export type EnquiryInput = {
  name: string;
  email: string;
  organisation: string;
  message: string;
};

export const SPONSOR_OFFER = {
  currency: "AUD",
  weeklyAmount: 25,
  label: "A$25 per week",
  includes: [
    "A labelled sponsor line on the site for one week",
    "A sponsor line in that Friday's newsletter, only when the week is sold",
  ],
} as const;

export const CONSENT_TEXT =
  "I agree to store my email for the Friday RiffRig letter. Sending is not switched on, so this only records a pending signup. A personal unsubscribe link is shown once after signup and will be added to the letter if sending is later confirmed.";
