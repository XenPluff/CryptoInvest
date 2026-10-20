/** Run ledger tests in a disposable database; never reset the application database. */
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const root = fileURLToPath(new URL("..", import.meta.url));
const testFile = process.argv.includes("--admin-provisioning")
  ? "tests/admin-provisioning.integration.test.ts"
  : "tests/backend.integration.test.ts";
loadEnv({ path: new URL("../.env", import.meta.url), quiet: true });

let admin;
let databaseName;
let created = false;
let runner;
let interrupted = false;
const signals = ["SIGINT", "SIGTERM"];
const stop = (signal) => {
  interrupted = true;
  runner?.kill(signal);
};

try {
  if (process.env.NODE_ENV === "production")
    throw new Error("Production mode is not supported.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const source = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(source.protocol))
    throw new Error("PostgreSQL is required.");
  const applicationName = decodeURIComponent(source.pathname.slice(1));
  const prefix =
    applicationName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24) || "aureon";
  databaseName = `${prefix}_integration_${randomBytes(8).toString("hex")}_test`;
  if (
    !/^[a-zA-Z0-9_]+_test$/.test(databaseName) ||
    databaseName === applicationName
  )
    throw new Error("Unsafe test database name.");
  const target = new URL(source);
  target.pathname = "/" + databaseName;

  admin = new pg.Client({ connectionString: source.toString() });
  await admin.connect();
  // Only this randomly named, newly created database is ever dropped below.
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  console.log(
    "Created a separate disposable PostgreSQL test database. Application data is untouched.",
  );
  for (const signal of signals) process.on(signal, stop);
  const status = await new Promise((resolve, reject) => {
    runner = spawn(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        testFile,
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          TEST_DATABASE_URL: target.toString(),
          // Test messages must stay in local capture even when cloud credentials exist.
          EMAIL_PROVIDER: "smtp",
          BREVO_API_KEY: "",
          RESEND_API_KEY: "",
          EMAIL_FROM: "Aureon tests <tests@aureon.invalid>",
          SMTP_HOST: "127.0.0.1",
          SMTP_PORT: "1025",
          SMTP_SECURE: "false",
          SMTP_REQUIRE_TLS: "false",
          SMTP_USER: "",
          SMTP_PASSWORD: "",
          SMTP_FROM: "Aureon tests <tests@aureon.invalid>",
        },
      },
    );
    runner.on("error", reject);
    runner.on("close", (code) => resolve(code ?? 1));
  });
  process.exitCode = interrupted ? 130 : Number(status);
} catch {
  // Connection URLs and provider configuration must never appear in error output.
  console.error(
    "Integration setup failed. Check local DATABASE_URL, PostgreSQL connectivity, CREATE DATABASE permission, and installed dependencies. Production mode is unsupported.",
  );
  process.exitCode = 1;
} finally {
  for (const signal of signals) process.off(signal, stop);
  if (created) {
    try {
      await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
      console.log("Removed the disposable integration database.");
    } catch {
      console.error(
        "Disposable database cleanup failed. Remove only the *_integration_*_test database created by this run after checking active test sessions.",
      );
      process.exitCode = 1;
    }
  }
  await admin?.end().catch(() => {});
}
