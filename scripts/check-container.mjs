/** Smoke-test the built image against the local development services without moving funds. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import dotenv from "dotenv";
process.chdir(resolve(import.meta.dirname, ".."));
const dockerEnv = {
  ...process.env,
  DOCKER_CONFIG: process.env.DOCKER_CONFIG || "/workspace/.cache/docker",
};
const run = (args, allowFailure = false) => {
  const result = spawnSync("docker", args, {
    env: dockerEnv,
    encoding: "utf8",
  });
  if (result.status !== 0 && !allowFailure)
    throw new Error(
      `Container operation failed: ${args[0]}. Check the local Docker service.`,
    );
  return result;
};
const network = "aureon-validation";
const name = "aureon-runtime-check";
const file = resolve(".aureon/container-check.env");
const env = dotenv.parse(readFileSync(".env"));
const fundingExpected = process.env.CONTAINER_CHECK_FUNDING_ENABLED === "true";
const renderCheck = process.env.CONTAINER_CHECK_RENDER === "true";
if (!env.DATABASE_URL) throw new Error("Local DATABASE_URL is required.");
const url = new URL(env.DATABASE_URL);
url.hostname = "aureon-postgres";
url.port = "5432";
const settings = {
  ...env,
  NODE_ENV: "production",
  APP_ORIGIN: "https://aureon.invalid",
  DATABASE_URL: url.toString(),
  SMTP_HOST: "aureon-mail",
  SMTP_PORT: "1025",
  SMTP_REQUIRE_TLS: "false",
  PORT: "3000",
  API_PORT: "4000",
  FUNDING_ENABLED: String(fundingExpected),
};
if (renderCheck) {
  delete settings.APP_ORIGIN;
  settings.RENDER_EXTERNAL_URL = "https://aureon.invalid";
}
// Only the generated local one-line configuration is supported; no credentials are logged.
for (const value of Object.values(settings))
  if (/[\r\n]/.test(value))
    throw new Error(
      "Container smoke check requires the one-line local development configuration.",
    );
writeFileSync(
  file,
  Object.entries(settings)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600, flag: "wx" },
);
let created = false,
  started = false;
const connected = [];
try {
  if (run(["network", "inspect", network], true).status !== 0) {
    run(["network", "create", network]);
    created = true;
  }
  for (const service of ["aureon-postgres", "aureon-mail"]) {
    const result = run(["network", "connect", network, service], true);
    if (result.status === 0) connected.push(service);
    else if (!result.stderr.includes("already exists"))
      throw new Error(
        "Local database/mail services could not join the validation network.",
      );
  }
  run([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    network,
    "--env-file",
    file,
    "-p",
    "127.0.0.1:3100:3000",
    "aureon:local",
    ...(renderCheck ? ["npm", "run", "start:render"] : []),
  ]);
  started = true;
  let health;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:3100/api/health", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        health = await response.json();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (
    health?.database !== "connected" ||
    health?.fundingEnabled !== fundingExpected
  )
    throw new Error(
      "Container health did not establish a connected database and the requested funding state.",
    );
  const plans = await (await fetch("http://127.0.0.1:3100/api/plans")).json();
  if (!Array.isArray(plans.plans) || !plans.plans.length)
    throw new Error("Container could not read the installed plan catalogue.");
  const denied = await fetch("http://127.0.0.1:3100/api/auth/me");
  if (denied.status !== 401)
    throw new Error("Unauthenticated API access was not rejected.");
  const home = await fetch("http://127.0.0.1:3100/");
  if (!home.ok || !(await home.text()).includes("AUREON"))
    throw new Error("Container homepage did not render.");
  console.log(
    `Production container passed: homepage, PostgreSQL connectivity, plan API, authentication boundary, and funding ${fundingExpected ? "enabled" : "disabled"}.`,
  );
} finally {
  if (started) run(["rm", "-f", name], true);
  for (const service of connected)
    run(["network", "disconnect", network, service], true);
  if (created) run(["network", "rm", network], true);
  unlinkSync(file);
}
