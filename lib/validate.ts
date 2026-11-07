import { z } from "zod";
import { CATEGORIES } from "./types";

const JUNK_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "example.com",
  "example.org",
  "test.com",
  "localhost",
]);

export function httpsPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
    if (host.includes(":")) return false;
    return true;
  } catch {
    return false;
  }
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email()
  .refine((email) => {
    const domain = email.split("@")[1] ?? "";
    if (JUNK_DOMAINS.has(domain)) return false;
    if (domain.endsWith(".invalid") || domain.endsWith(".test") || domain.endsWith(".local")) return false;
    return true;
  }, "email rejected");

const consentSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "yes" || value === "on",
  z.literal(true),
);

function honeypot(value: string | undefined): boolean {
  return !value || value.trim() === "";
}

export const signupSchema = z.object({
  email: emailSchema,
  consent: consentSchema,
  source: z.enum(["home", "newsletter"]),
  company_url: z.string().max(200).optional().default(""),
});

export const submissionSchema = z.object({
  vendor: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  category: z.enum(CATEGORIES),
  officialUrl: z.string().trim().max(400).refine(httpsPublicUrl, "https url required"),
  note: z.string().trim().max(500).optional().default(""),
  company_url: z.string().max(200).optional().default(""),
});

export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  organisation: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(10).max(1000),
  company_url: z.string().max(200).optional().default(""),
});

export const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export const unsubscribeSchema = z.object({
  token: z.string().trim().min(20).max(500),
});

export const searchMissSchema = z.object({
  query: z.string().trim().min(2).max(80),
});

export const pageviewSchema = z.object({
  path: z.string().trim().min(1).max(120),
});

export function honeypotTripped(value: string | undefined): boolean {
  return !honeypot(value);
}

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

const PAGEVIEW_PATHS = [
  /^\/$/,
  /^\/catalogue$/,
  /^\/deals$/,
  /^\/submit$/,
  /^\/newsletter$/,
  /^\/sponsors$/,
  /^\/unsubscribe$/,
  /^\/plugins\/[a-z0-9-]{1,80}$/,
];

export function normalisePagePath(path: string): string | null {
  const bare = path.split("?")[0]?.split("#")[0] ?? "";
  if (!bare.startsWith("/")) return null;
  return PAGEVIEW_PATHS.some((pattern) => pattern.test(bare)) ? bare : null;
}

export function normaliseSearchQuery(query: string): string | null {
  const compact = query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (compact.length < 2) return null;
  if (looksLikeEmail(compact)) return null;
  return compact;
}
