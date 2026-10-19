import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
process.chdir(root);
mkdirSync(".aureon", { recursive: true });
if (!existsSync(".env")) {
  const dbPassword = randomBytes(24).toString("hex");
  const text = [
    `DATABASE_URL=postgresql://aureon:${dbPassword}@127.0.0.1:5432/aureon?schema=public`,
    `JWT_SECRET=${randomBytes(48).toString("hex")}`,
    `ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`,
    `KYC_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`,
    "APP_ORIGIN=http://localhost:3000",
    "APP_URL=http://localhost:3000",
    "API_PORT=4000",
    "PORT=4000",
    "FUNDING_ENABLED=false",
    "EMAIL_PROVIDER=smtp",
    "SMTP_HOST=127.0.0.1",
    "SMTP_PORT=1025",
    "SMTP_SECURE=false",
    "SMTP_FROM=Aureon <accounts@aureon.local>",
    "NODE_ENV=development",
    "",
  ].join("\n");
  writeFileSync(".env", text, { mode: 0o600, flag: "wx" });
  writeFileSync(
    ".aureon/postgres.env",
    `POSTGRES_USER=aureon\nPOSTGRES_PASSWORD=${dbPassword}\nPOSTGRES_DB=aureon\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Created private local configuration. Real-money funding remains disabled.",
  );
}
function run(args) {
  const r = spawnSync("docker", args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}
function ensure(name, args) {
  const state = spawnSync(
    "docker",
    ["inspect", "--format", "{{.State.Running}}", name],
    { encoding: "utf8" },
  );
  if (state.status === 0) {
    if (state.stdout.trim() !== "true") run(["start", name]);
    return;
  }
  run(["run", "-d", "--name", name, "--restart", "unless-stopped", ...args]);
}
if (!existsSync(".aureon/postgres.env"))
  throw new Error(
    "Existing .env was preserved. Configure PostgreSQL or create .aureon/postgres.env securely.",
  );
ensure("aureon-postgres", [
  "--env-file",
  resolve(".aureon/postgres.env"),
  "-p",
  "127.0.0.1:5432:5432",
  "-v",
  `${resolve(".aureon/postgres")}:/var/lib/postgresql/data`,
  "postgres:17-alpine",
]);
ensure("aureon-mail", [
  "-p",
  "127.0.0.1:1025:1025",
  "-p",
  "127.0.0.1:8025:8025",
  "axllent/mailpit:v1.29",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) {
  const r = spawnSync(
    "docker",
    ["exec", "aureon-postgres", "pg_isready", "-U", "aureon", "-d", "aureon"],
    { stdio: "ignore" },
  );
  if (r.status === 0) {
    console.log("PostgreSQL ready; local test mail service running.");
    process.exit(0);
  }
  await sleep(500);
}
throw new Error(
  "PostgreSQL did not become ready. Inspect docker logs aureon-postgres.",
);
