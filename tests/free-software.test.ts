import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { seedEntries } from "@/lib/catalogue-data";
import { filterFreeTools, freeTools } from "@/lib/free-software";

const catalogueRaw = readFileSync("data/catalogue.json", "utf8");
const seedRaw = readFileSync("scripts/seed.mjs", "utf8");

describe("free starter", () => {
  it("is a short checked set and does not import the 69-item research list", () => {
    expect(freeTools.length).toBeGreaterThanOrEqual(8);
    expect(freeTools.length).toBeLessThan(30);
    expect(new Set(freeTools.map((tool) => tool.slug)).size).toBe(freeTools.length);
    const stages = new Set(freeTools.map((tool) => tool.stage));
    expect(stages).toEqual(new Set(["host", "amp", "cabinet", "effects", "capture"]));
    for (const tool of freeTools) {
      expect(tool.officialUrl.startsWith("https://")).toBe(true);
      expect(tool.checkedOn).toBe("2026-11-08");
      expect(tool.restrictionLabel.length).toBeGreaterThan(8);
      expect(tool.requirements.toLowerCase().includes("trial")).toBe(false);
      expect(tool.sourceNote.length).toBeGreaterThan(40);
    }
  });

  it("does not present paid catalogue products as the free edition", () => {
    const names = freeTools.map((tool) => tool.name);
    expect(names).not.toContain("AmpliTube 5");
    expect(names).not.toContain("TONEX 2");
    expect(names).not.toContain("Guitar Rig 7 Pro");
    expect(names).not.toContain("Amplifikation Vermilion");
    expect(names).not.toContain("ValhallaRoom");
    expect(names).toContain("AmpliTube 5 CS");
    expect(names).toContain("TONEX 2 CS");
    expect(names).toContain("Guitar Rig 7 Player");
    expect(freeTools.find((tool) => tool.slug === "audacity")?.catalogueSlug).toBe("audacity");
    expect(freeTools.find((tool) => tool.slug === "neural-amp-modeler")?.catalogueSlug).toBe("neural-amp-modeler");
  });

  it("filters by step and by a platform the seller named", () => {
    expect(filterFreeTools("host", undefined).every((tool) => tool.stage === "host")).toBe(true);
    expect(filterFreeTools(undefined, "linux").every((tool) => tool.platforms.includes("linux"))).toBe(true);
    expect(filterFreeTools("cabinet", "linux")).toEqual([]);
    expect(filterFreeTools(undefined, undefined)).toHaveLength(freeTools.length);
  });

  it("leaves the paid catalogue and seed untouched", () => {
    expect(seedEntries).toHaveLength(39);
    expect(catalogueRaw.includes("waveform-free")).toBe(false);
    expect(catalogueRaw.includes("amplitube5cs")).toBe(false);
    expect(seedRaw.includes("free-starter")).toBe(false);
  });
});
