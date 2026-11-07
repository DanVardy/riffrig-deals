import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();

function runNode(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, script)], { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited ${code ?? 1}`));
    });
  });
}

if (process.env.DATABASE_URL) {
  try {
    await runNode("scripts/release.mjs");
  } catch {
    console.error(JSON.stringify({ code: "startup_release_failed" }));
    process.exit(1);
  }
}

const standalone = path.join(root, ".next", "standalone");
const serverJs = path.join(standalone, "server.js");
if (!fs.existsSync(serverJs)) {
  console.error(JSON.stringify({ code: "standalone_server_missing" }));
  process.exit(1);
}

fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(standalone, "public"), { recursive: true });
}

const server = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "0.0.0.0",
  },
});

function stop(signal) {
  server.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
server.on("exit", (code) => process.exit(code ?? 1));
