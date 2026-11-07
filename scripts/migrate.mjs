import fs from "fs";
import path from "path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(JSON.stringify({ code: "database_url_missing" }));
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
});

const dir = path.join(process.cwd(), "db", "migrations");
const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();

await client.connect();
let exitCode = 0;
try {
  await client.query("BEGIN");
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  let applied = 0;
  for (const file of files) {
    const existing = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (existing.rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    applied += 1;
  }
  await client.query("COMMIT");
  console.error(JSON.stringify({ code: "migrations_applied", files: files.length, applied }));
} catch {
  exitCode = 1;
  try {
    await client.query("ROLLBACK");
  } catch {
    /* the connection may already be closed */
  }
  console.error(JSON.stringify({ code: "migration_failed" }));
} finally {
  await client.end();
}
process.exit(exitCode);
