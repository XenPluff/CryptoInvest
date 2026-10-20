import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import pg from "pg";
import { decryptBackup, fileDigest } from "../server/backup-crypto";
import { databaseManifest, postgresConnection, postgresToolEnvironment } from "../server/backups";

export async function verifyRestore(options: { archive: string; privateKey: string; expectedSha256: string; targetUrl: string; confirmDisposable: boolean }) {
  if (process.env.NODE_ENV === "production" || !options.confirmDisposable) throw new Error("Use a separate disposable recovery database outside production and confirm the restore drill.");
  const target = new URL(postgresConnection(options.targetUrl));
  const database = decodeURIComponent(target.pathname.slice(1));
  if (!/^[a-zA-Z0-9_]+_restore_test$/.test(database)) throw new Error("Recovery database names must end in _restore_test.");
  if (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === target.pathname) throw new Error("The application database cannot be used for a restore drill.");
  if (!/^[a-f0-9]{64}$/.test(options.expectedSha256) || await fileDigest(options.archive) !== options.expectedSha256) throw new Error("The archive does not match its recorded SHA-256 checksum.");
  const directory = await mkdtemp(join(tmpdir(), "aureon-restore-"));
  const client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 10000 });
  try {
    const archivePath = join(directory, "archive.dump");
    const manifest = await decryptBackup(options.archive, await readFile(options.privateKey, "utf8"), archivePath);
    if (manifest.database === database) throw new Error("The source database cannot be used for a restore drill.");
    await client.connect();
    if (!(await client.query("SELECT pg_try_advisory_lock(482119733) AS locked")).rows[0].locked) throw new Error("Another recovery drill is already using this disposable database.");
    const existing = await client.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f')");
    if (existing.rows[0].count !== 0) throw new Error("The disposable recovery database must be empty. Existing data will not be overwritten.");
    // pg_dump includes CREATE SCHEMA public. Remove only the empty default
    // schema, without CASCADE; functions or other existing contents make it fail.
    await client.query("DROP SCHEMA IF EXISTS public");
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.env.PG_RESTORE_PATH || "pg_restore", ["--dbname=", "--exit-on-error", "--no-owner", "--no-privileges", "--single-transaction", archivePath], { env: postgresToolEnvironment(target.toString()), stdio: "ignore", timeout: 300000 });
      child.once("error", () => reject(new Error("PostgreSQL restore tools could not start.")));
      child.once("close", code => code === 0 ? resolve() : reject(new Error("Restore failed. Inspect only the disposable recovery database.")));
    });
    const restored = await databaseManifest(client);
    if (JSON.stringify(restored.tables) !== JSON.stringify(manifest.tables) || restored.ledgerHash !== manifest.ledgerHash) throw new Error("Recovery verification failed: table counts or financial ledger contents differ.");
    return { verifiedAt: new Date().toISOString(), archiveSha256: options.expectedSha256, tablesVerified: Object.keys(manifest.tables).length, ledgerVerified: true, productionModified: false };
  } finally { await client.end().catch(() => {}); await rm(directory, { recursive: true, force: true }); }
}
if (process.argv[1]?.endsWith("restore-backup.ts") || process.argv[1]?.endsWith("restore-backup.js")) {
  const argument = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : ""; };
  void verifyRestore({ archive: argument("--archive"), privateKey: argument("--private-key"), expectedSha256: argument("--sha256"), targetUrl: process.env.RESTORE_DATABASE_URL || "", confirmDisposable: process.argv.includes("--confirm-disposable-restore") }).then(async result => {
    const report = argument("--report");
    if (report) await writeFile(report, JSON.stringify(result, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify(result));
  }).catch(error => { console.error(error instanceof Error && /checksum|empty|_restore_test|production|source database|application database|Recovery verification|Restore failed|confirm the restore drill/.test(error.message) ? error.message : "Recovery drill failed. Check the archive, recovery key, database, and PostgreSQL tools; no production restore was attempted."); process.exitCode = 1; });
}
