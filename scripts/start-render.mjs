/** Prepare the hosted database and launch the already-built website and API. */
import { spawn } from "node:child_process";

let child;
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    stopping = true;
    if (child?.pid) {
      try {
        process.kill(-child.pid, signal);
      } catch {}
    }
  });
}
async function run(command, args) {
  if (stopping) throw new Error("Hosted service stopped.");
  return new Promise((resolve, reject) => {
    child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
      detached: true,
    });
    child.once("error", () =>
      reject(new Error("Hosted startup could not launch a required command.")),
    );
    child.once("close", (code, signal) => {
      child = undefined;
      if (code === 0 && !stopping) resolve();
      else
        reject(
          new Error(
            stopping || signal
              ? "Hosted service stopped."
              : "Hosted startup failed. Check the service logs.",
          ),
        );
    });
  });
}
try {
  if (!process.env.DATABASE_URL)
    throw new Error("A hosted PostgreSQL DATABASE_URL is required.");
  if (!process.env.APP_ORIGIN && !process.env.RENDER_EXTERNAL_URL)
    throw new Error(
      "Set APP_ORIGIN or use Render's assigned HTTPS service URL.",
    );
  if (process.env.PORT !== "3000" || process.env.API_PORT !== "4000")
    throw new Error(
      "Configure PORT=3000 for the website and API_PORT=4000 for its private API.",
    );
  await run(process.execPath, ["scripts/migrate.mjs"]);
  await run(process.execPath, [
    "--env-file=.env",
    "--import",
    "tsx",
    "prisma/seed.ts",
  ]);
  await run("npm", ["start"]);
} catch (error) {
  if (!stopping)
    console.error(
      error instanceof Error ? error.message : "Hosted startup failed.",
    );
  process.exitCode = stopping ? 0 : 1;
}
