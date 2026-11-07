import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { json } from "./http";

export function configuredAdminToken(): string | null {
  const token = process.env.ADMIN_TOKEN ?? "";
  if (token.length < 16) return null;
  return token;
}

export function adminTokenMatches(presented: string | null | undefined): boolean {
  const expected = configuredAdminToken();
  if (!expected || !presented) return false;
  const left = createHash("sha256").update(presented).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function readPresentedToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const alt = request.headers.get("x-admin-token");
  return alt?.trim() || null;
}

export function requireAdmin(request: Request): Response | null {
  if (!configuredAdminToken()) {
    return json(503, { ok: false, error: "admin_not_configured" });
  }
  if (!adminTokenMatches(readPresentedToken(request))) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  const url = new URL(request.url);
  if (url.searchParams.has("token") || url.searchParams.has("admin_token")) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  return null;
}
