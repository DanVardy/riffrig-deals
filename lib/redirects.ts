export function safeSponsorRedirect(stored: string): URL | null {
  try {
    const url = new URL(stored);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local")) return null;
    return url;
  } catch {
    return null;
  }
}

export function sponsorSlugOk(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}
