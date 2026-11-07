import { spawnSync } from "child_process";
import path from "path";

if (!process.env.DATABASE_URL) {
  console.error(JSON.stringify({ code: "database_url_missing" }));
  process.exit(1);
}

function run(script) {
  const result = spawnSync(process.execPath, [path.join(process.cwd(), script)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(JSON.stringify({ code: "release_failed", step: script, status: result.status ?? 1 }));
    process.exit(result.status || 1);
  }
}

run("scripts/migrate.mjs");
run("scripts/seed.mjs");
console.error(JSON.stringify({ code: "release_ok" }));
