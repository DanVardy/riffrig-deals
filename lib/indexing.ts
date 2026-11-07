import type { Metadata } from "next";

type IndexingEnv = NodeJS.ProcessEnv | { ALLOW_SEARCH_INDEXING?: string };

/** Exact opt-in. Anything else, including unset, stays out of search indexes. */
export function searchIndexingAllowed(env: IndexingEnv = process.env): boolean {
  return env.ALLOW_SEARCH_INDEXING === "true";
}

export function publicRobots(env: IndexingEnv = process.env): Metadata["robots"] {
  if (searchIndexingAllowed(env)) {
    return { index: true, follow: true };
  }
  return {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  };
}

export function robotTagHeader(env: IndexingEnv = process.env): { key: string; value: string } | null {
  if (searchIndexingAllowed(env)) return null;
  return { key: "X-Robots-Tag", value: "noindex, nofollow" };
}

export type RobotsPolicy = {
  rules: { userAgent: string; allow?: string; disallow?: string | string[] }[];
  sitemap?: string;
};

export function robotsPolicy(origin: string, env: IndexingEnv = process.env): RobotsPolicy {
  if (!searchIndexingAllowed(env)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/unsubscribe", "/go/"] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
