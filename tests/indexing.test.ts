import { describe, expect, it } from "vitest";
import { publicRobots, robotTagHeader, robotsPolicy, searchIndexingAllowed } from "@/lib/indexing";

describe("search indexing", () => {
  it("stays noindex unless the flag is exactly true", () => {
    expect(searchIndexingAllowed({})).toBe(false);
    expect(searchIndexingAllowed({ ALLOW_SEARCH_INDEXING: "" })).toBe(false);
    expect(searchIndexingAllowed({ ALLOW_SEARCH_INDEXING: "false" })).toBe(false);
    expect(searchIndexingAllowed({ ALLOW_SEARCH_INDEXING: "TRUE" })).toBe(false);
    expect(searchIndexingAllowed({ ALLOW_SEARCH_INDEXING: "1" })).toBe(false);
    expect(searchIndexingAllowed({ ALLOW_SEARCH_INDEXING: "true" })).toBe(true);
  });

  it("hides the catalogue from crawlers by default and opens it only when allowed", () => {
    const hidden = robotsPolicy("https://riffrig.example");
    expect(hidden.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(hidden.sitemap).toBeUndefined();
    expect(publicRobots({})).toMatchObject({ index: false, follow: false });
    expect(robotTagHeader({})).toEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });

    const open = robotsPolicy("https://riffrig.example", { ALLOW_SEARCH_INDEXING: "true" });
    expect(open.sitemap).toBe("https://riffrig.example/sitemap.xml");
    expect(open.rules[0]?.disallow).toEqual(["/api/", "/unsubscribe", "/go/"]);
    expect(publicRobots({ ALLOW_SEARCH_INDEXING: "true" })).toEqual({ index: true, follow: true });
    expect(robotTagHeader({ ALLOW_SEARCH_INDEXING: "true" })).toBeNull();
  });
});
