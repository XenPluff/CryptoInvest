import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { encryptBackup, validateBackupPublicKey, type BackupManifest } from "./backup-crypto";

export const backupKeySetting = "backupPublicKey";
export function storageSettings(environment = process.env) {
  const names = ["BACKUP_S3_BUCKET", "BACKUP_S3_REGION", "BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY"];
  const missing = names.filter(name => !environment[name]?.trim());
  const endpoint = environment.BACKUP_S3_ENDPOINT?.trim() || undefined;
  let valid = true;
  if (endpoint) {
    try { const url = new URL(endpoint); valid = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash; }
    catch { valid = false; }
  }
  return { configured: missing.length === 0 && valid, missing, valid, bucket: environment.BACKUP_S3_BUCKET?.trim(), region: environment.BACKUP_S3_REGION?.trim(), endpoint,
    accessKeyId: environment.BACKUP_S3_ACCESS_KEY_ID, secretAccessKey: environment.BACKUP_S3_SECRET_ACCESS_KEY };
}
export function postgresConnection(value: string) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("PostgreSQL is required.");
  // Prisma-only parameters are not understood by PostgreSQL's command-line tools.
  for (const key of ["schema", "connection_limit", "pool_timeout", "pgbouncer", "connect_timeout", "statement_cache_size"]) url.searchParams.delete(key);
  return url.toString();
}
export function postgresToolEnvironment(value: string) {
  const url = new URL(postgresConnection(value));
  const environment: NodeJS.ProcessEnv = { ...process.env, PGHOST: url.hostname.replace(/^\[|\]$/g, ""), PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGCONNECT_TIMEOUT: "10" };
  for (const [parameter, variable] of Object.entries({ sslmode: "PGSSLMODE", sslcert: "PGSSLCERT", sslkey: "PGSSLKEY", sslrootcert: "PGSSLROOTCERT", sslcrl: "PGSSLCRL", channel_binding: "PGCHANNELBINDING", application_name: "PGAPPNAME", options: "PGOPTIONS" })) {
    const setting = url.searchParams.get(parameter); if (setting !== null) environment[variable] = setting;
  }
  return environment;
}
export async function databaseManifest(client: pg.Client): Promise<BackupManifest> {
  const tables = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const counts: Record<string, number> = {};
  for (const { tablename } of tables.rows) {
    const name = '"' + tablename.replaceAll('"', '""') + '"';
    counts[tablename] = Number((await client.query(`SELECT count(*)::text AS count FROM public.${name}`)).rows[0].count);
  }
  const ledgerHash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const query = client.query(new pg.Query('SELECT id,"userId","amountCents",kind,"referenceId" FROM "LedgerEntry" ORDER BY id'));
    query.on("row", row => ledgerHash.update(JSON.stringify(row) + "\n")); query.once("error", reject); query.once("end", () => resolve());
  });
  return { version: 1, database: (await client.query("SELECT current_database() AS name")).rows[0].name, createdAt: new Date().toISOString(), tables: counts, ledgerHash: ledgerHash.digest("hex") };
}
/** Snapshot and archive cover the same committed data, including financial ledger checks. */
export async function createDatabaseBackup(databaseUrl: string, publicPem: string) {
  validateBackupPublicKey(publicPem);
  const directory = await mkdtemp(join(tmpdir(), "aureon-backup-"));
  const path = join(directory, `${randomUUID()}.aureon`);
  const connectionString = postgresConnection(databaseUrl);
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
  let child: ReturnType<typeof spawn> | undefined;
  try {
    await client.connect();
    const locked = (await client.query("SELECT pg_try_advisory_lock(482119730) AS locked")).rows[0].locked;
    if (!locked) throw new Error("Another backup is already running. Try again shortly.");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (await client.query("SELECT pg_export_snapshot() AS snapshot")).rows[0].snapshot;
    const manifest = await databaseManifest(client);
    child = spawn(process.env.PG_DUMP_PATH || "pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--schema=public", `--snapshot=${snapshot}`], {
      env: postgresToolEnvironment(databaseUrl), stdio: ["ignore", "pipe", "pipe"], timeout: 300000,
    });
    let diagnostics = "";
    child.stderr?.on("data", chunk => { if (diagnostics.length < 4096) diagnostics += chunk.toString(); });
    const completed = new Promise<void>((resolve, reject) => {
      child!.once("error", () => reject(new Error("PostgreSQL backup tools could not start.")));
      child!.once("close", code => {
        const reason = /snapshot/i.test(diagnostics) ? "snapshot" : /connect|authentication|password/i.test(diagnostics) ? "connection" : /permission/i.test(diagnostics) ? "permissions" : /version/i.test(diagnostics) ? "version" : "tool";
        code === 0 ? resolve() : reject(new Error(`PostgreSQL backup did not complete (${reason}).`));
      });
    });
    // Attach both promises immediately so a failed child never becomes unhandled.
    const [encrypted] = await Promise.all([encryptBackup(child.stdout!, path, publicPem, manifest), completed]);
    await client.query("COMMIT");
    return { path, directory, ...encrypted };
  } catch (error) {
    child?.kill("SIGTERM");
    await rm(directory, { recursive: true, force: true });
    throw error;
  } finally { await client.end().catch(() => {}); }
}
export async function backupReadiness(db: PrismaClient) {
  const publicPem = (await db.setting.findUnique({ where: { key: backupKeySetting } }))?.value;
  const storage = storageSettings();
  let fingerprint: string | null = null;
  try { if (publicPem) fingerprint = validateBackupPublicKey(publicPem).fingerprint; } catch {}
  return { encryptionConfigured: Boolean(fingerprint), keyFingerprint: fingerprint, storageConfigured: storage.configured, missingStorageSettings: storage.missing, validStorageEndpoint: storage.valid,
    schedule: "Daily while the service is running; catch up on startup", automaticEnabled: Boolean(fingerprint && storage.configured), retention: "Configure a 30-day lifecycle on the private storage bucket." };
}
export async function uploadBackup(path: string, objectKey: string, sha256: string, sizeBytes: number) {
  const settings = storageSettings();
  if (!settings.configured) throw new Error("Private backup storage is not configured.");
  const client = new S3Client({ region: settings.region, endpoint: settings.endpoint, forcePathStyle: Boolean(settings.endpoint), maxAttempts: 3,
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId: settings.accessKeyId!, secretAccessKey: settings.secretAccessKey! } });
  try {
    await client.send(new PutObjectCommand({ Bucket: settings.bucket, Key: objectKey, Body: createReadStream(path), ContentLength: sizeBytes, ContentType: "application/octet-stream", Metadata: { sha256 } }), { abortSignal: AbortSignal.timeout(180000) });
    const retrieved = await client.send(new GetObjectCommand({ Bucket: settings.bucket, Key: objectKey }), { abortSignal: AbortSignal.timeout(180000) });
    if (!retrieved.Body) throw new Error("Backup verification could not retrieve the stored archive.");
    const hash = createHash("sha256"); let bytes = 0;
    for await (const chunk of retrieved.Body as AsyncIterable<Uint8Array>) { hash.update(chunk); bytes += chunk.length; if (bytes > sizeBytes) throw new Error("Stored backup size mismatch."); }
    if (bytes !== sizeBytes || hash.digest("hex") !== sha256) throw new Error("Stored backup checksum mismatch.");
  } finally { client.destroy(); }
}
export async function scheduledBackup(db: PrismaClient, now = new Date(), upload = uploadBackup) {
  const publicPem = (await db.setting.findUnique({ where: { key: backupKeySetting } }))?.value;
  if (!publicPem || !storageSettings().configured) return { state: "not_configured" };
  const { fingerprint } = validateBackupPublicKey(publicPem);
  const slot = `daily:${now.toISOString().slice(0, 10)}`;
  let run = await db.backupRun.findUnique({ where: { slot } });
  if (run) {
    if (run.status === "SUCCEEDED" || (run.status === "RUNNING" && run.startedAt.getTime() > now.getTime() - 3600000) || run.attempts >= 3 || run.startedAt.getTime() > now.getTime() - 900000) return { state: "already_claimed" };
    const claimed = await db.backupRun.updateMany({ where: { id: run.id, status: run.status, startedAt: run.startedAt }, data: { status: "RUNNING", startedAt: now, finishedAt: null, error: null, attempts: { increment: 1 }, keyFingerprint: fingerprint } });
    if (claimed.count !== 1) return { state: "already_claimed" };
  } else {
    try { run = await db.backupRun.create({ data: { slot, storage: "S3", keyFingerprint: fingerprint, startedAt: now } }); }
    catch (error) { if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { state: "already_claimed" }; throw error; }
  }
  let backup: Awaited<ReturnType<typeof createDatabaseBackup>> | undefined;
  try {
    backup = await createDatabaseBackup(process.env.DATABASE_URL!, publicPem);
    const objectKey = `aureon/backups/${now.toISOString().slice(0, 10)}/${run.id}.aureon`;
    await upload(backup.path, objectKey, backup.sha256, backup.sizeBytes);
    await db.backupRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", objectKey, sha256: backup.sha256, sizeBytes: backup.sizeBytes, finishedAt: new Date(), error: null } });
    return { state: "succeeded" };
  } catch {
    await db.backupRun.update({ where: { id: run.id }, data: { status: "FAILED", error: "Backup or storage verification failed. Check the database tools, encryption key, and private storage settings.", finishedAt: new Date() } });
    return { state: "failed" };
  } finally { if (backup) await rm(backup.directory, { recursive: true, force: true }); }
}
