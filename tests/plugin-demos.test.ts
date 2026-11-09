import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import demos from "@/data/plugin-demos.json";
import { seedEntries } from "@/lib/catalogue-data";
import { freeTools } from "@/lib/free-software";
import { pluginDemo } from "@/lib/plugin-demos";

const known = new Set([
  ...seedEntries.map((entry) => entry.slug),
  ...freeTools.map((tool) => tool.slug),
]);

describe("company demos", () => {
  it("embeds official videos only for products on the site", () => {
    const entries = Object.entries(demos);
    expect(entries.length).toBeGreaterThan(15);
    for (const [slug, demo] of entries) {
      expect(known.has(slug)).toBe(true);
      expect(demo.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(demo.watchUrl).toBe(`https://www.youtube.com/watch?v=${demo.youtubeId}`);
      expect(demo.sourcePage.startsWith("https://")).toBe(true);
      expect(demo.channel.length).toBeGreaterThan(2);
      expect(demo.title.length).toBeGreaterThan(8);
      expect(pluginDemo(slug)?.youtubeId).toBe(demo.youtubeId);
    }
  });

  it("does not attach a different product's video or a third-party playthrough", () => {
    expect(pluginDemo("tonex-2")).toBeNull();
    expect(pluginDemo("ownhammer-revolution-bundle")).toBeNull();
    expect(pluginDemo("ignite-nadir")).toBeNull();
    expect(pluginDemo("valhalla-room")).toBeNull();
    expect(pluginDemo("amplitube-5")?.channel).toBe("ikmultimedia");
    expect(pluginDemo("archetype-gojira-x")?.channel).toBe("Neural DSP");
  });

  it("does not put demo files into the catalogue seed", () => {
    const raw = readFileSync("data/catalogue.json", "utf8");
    expect(raw.includes("youtube")).toBe(false);
    expect(raw.includes("plugin-demos")).toBe(false);
  });
});
