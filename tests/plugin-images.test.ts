import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import sources from "@/data/plugin-image-sources.json";
import { seedEntries } from "@/lib/catalogue-data";
import { pluginImage } from "@/lib/plugin-images";

describe("plugin images", () => {
  it("maps a local image for every catalogue slug", () => {
    const slugs = new Set(seedEntries.map((entry) => entry.slug));
    const mapped = Object.entries(sources);
    expect(mapped.length).toBe(seedEntries.length);
    for (const [slug, source] of mapped) {
      expect(slugs.has(slug)).toBe(true);
      expect(existsSync(source.file)).toBe(true);
      expect(source.src.startsWith("/plugins/")).toBe(true);
      expect(source.width).toBeGreaterThan(0);
      expect(source.height).toBeGreaterThan(0);
      expect(source.alt.length).toBeGreaterThan(10);
      expect(source.sourcePage.startsWith("https://")).toBe(true);
      expect(source.assetUrl.startsWith("https://")).toBe(true);
      expect(source.usageStatement.length).toBeGreaterThan(40);
      expect(pluginImage(slug)).toEqual({
        src: source.src,
        width: source.width,
        height: source.height,
        alt: source.alt,
      });
    }
  });

  it("uses vendor product art for the verified deals and does not invent a licence", () => {
    expect(pluginImage("amplitube-5")?.src).toBe("/plugins/amplitube-5.webp");
    expect(pluginImage("morgan-amps-suite-x")?.src).toBe("/plugins/morgan-amps-suite-x.webp");
    expect(pluginImage("audacity")?.src).toBe("/plugins/audacity.svg");
    expect(pluginImage("neural-amp-modeler")?.src).toBe("/plugins/neural-amp-modeler.webp");
    for (const source of Object.values(sources)) {
      expect(source.usageStatement.toLowerCase().includes("licensed for commercial use")).toBe(false);
    }
  });

  it("does not put image paths into the catalogue seed", () => {
    const raw = readFileSync("data/catalogue.json", "utf8");
    expect(raw.includes("audacity.svg")).toBe(false);
    expect(raw.includes("neural-amp-modeler.webp")).toBe(false);
    expect(raw.includes("amplitube-5.webp")).toBe(false);
    expect(raw.includes("morgan-amps-suite-x.webp")).toBe(false);
    expect(raw.includes("plugin-image-sources")).toBe(false);
  });
});
