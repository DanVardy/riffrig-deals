import type { MetadataRoute } from "next";
import { getRuntime } from "@/lib/runtime";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().origin;
  const staticPaths = ["", "/catalogue", "/deals", "/submit", "/newsletter", "/sponsors"];
  const runtime = getRuntime();
  const entries = runtime.mode === "fail-closed" ? [] : await runtime.store.listEntries();
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path || "/"}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...entries.map((entry) => ({ url: `${base}/plugins/${entry.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
