import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const seed = readFileSync("scripts/seed.mjs", "utf8");
const migrate = readFileSync("scripts/migrate.mjs", "utf8");
const release = readFileSync("scripts/release.mjs", "utf8");
const serve = readFileSync("scripts/serve.mjs", "utf8");

describe("catalogue release", () => {
  it("inserts missing catalogue rows and does not rewrite existing or subscriber data", () => {
    expect(seed).toContain("ON CONFLICT (slug) DO NOTHING");
    expect(seed).not.toContain("DO UPDATE");
    expect(seed).not.toMatch(/signups|submissions|enquiries|sponsors|app_errors/);
    expect(seed).toContain("seed_applied");
    expect(seed).toContain("databaseMatches");
    expect(migrate).toContain("process.exit(exitCode)");
    expect(release).toContain("scripts/migrate.mjs");
    expect(release).toContain("scripts/seed.mjs");
    expect(release).toContain("release_failed");
  });

  it("boots the standalone server only after a successful release", () => {
    expect(serve).toContain("scripts/release.mjs");
    expect(serve).toContain("standalone_server_missing");
    expect(serve).toContain("startup_release_failed");
    expect(serve).not.toContain('from "next"');
    expect(serve).not.toContain("next start");
  });
});
