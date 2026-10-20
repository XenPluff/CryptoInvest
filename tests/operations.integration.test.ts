import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, type Server } from "node:http";
import pg from "pg";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import type { PrismaClient } from "@prisma/client";
import { createDatabaseBackup, scheduledBackup } from "../server/backups";
import { verifyRestore } from "../scripts/restore-backup";

const connectionString = process.env.TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;
const keys = generateKeyPairSync("rsa", { modulusLength: 3072, publicKeyEncoding: { format: "pem", type: "spki" }, privateKeyEncoding: { format: "pem", type: "pkcs8" } });
integration("backup recovery and operational alert integration", () => {
  let db: PrismaClient; let native: pg.Client; let server: Server; let base: string; let directory: string;
  let operations: typeof import("../server/operations"); let notifications: typeof import("../server/notifications");
  let adminCookie: string; let userCookie: string; let administrator: string;
  const createdDatabases: string[] = []; const password = "Recovery-fixture-password-639!";
  const secret = authenticator.generateSecret(); const code = () => authenticator.generate(secret);
  async function request(path: string, method = "GET", body?: any, cookie = adminCookie) {
    return fetch(base + "/api/admin/operations" + path, { method, headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", Cookie: cookie || "" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  beforeAll(async () => {
    const source = new URL(connectionString!);
    if (!source.pathname.endsWith("_test") || source.pathname === new URL(process.env.DATABASE_URL!).pathname) throw new Error("A separate disposable database is required.");
    process.env.DATABASE_URL = connectionString;
    process.env.JWT_SECRET = randomBytes(48).toString("hex"); process.env.KYC_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    process.env.NODE_ENV = "test"; process.env.APP_ORIGIN = "http://localhost:3000";
    directory = await mkdtemp(join(tmpdir(), "aureon-operations-test-"));
    // Local test wrappers use PostgreSQL 17 tools already in the development DB
    // container; credentials are inherited through env, never command arguments.
    for (const tool of process.env.OPERATIONS_NATIVE_PG_TOOLS === "true" ? [] : ["pg_dump", "pg_restore"]) {
      const path = join(directory, tool);
      await writeFile(path, `#!/usr/bin/env node\nconst {spawn}=require('node:child_process');const {createReadStream}=require('node:fs');const args=process.argv.slice(2);const file=${JSON.stringify(tool === "pg_restore")}?args.pop():null;const child=spawn('docker',['exec',...(file?['-i']:[]),'-e','PGDATABASE','-e','PGUSER','-e','PGPASSWORD','-e','PGHOST','-e','PGPORT','-e','PGCONNECT_TIMEOUT','aureon-postgres',${JSON.stringify(tool)},...args],{env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'5432'},stdio:[file?'pipe':'ignore','inherit','inherit']});if(file)createReadStream(file).pipe(child.stdin);child.on('error',()=>process.exit(1));child.on('exit',c=>process.exit(c??1));\n`);
      await chmod(path, 0o700); process.env[tool === "pg_dump" ? "PG_DUMP_PATH" : "PG_RESTORE_PATH"] = path;
    }
    native = new pg.Client({ connectionString }); await native.connect();
    const root = new URL("../prisma/migrations/", import.meta.url);
    for (const entry of (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) await native.query(await readFile(new URL(`${entry.name}/migration.sql`, root), "utf8"));
    db = (await import("../server/db")).prisma;
    const encrypt = (await import("../server/crypto")).encrypt;
    const passwordHash = await bcrypt.hash(password, 4);
    const accounts = [];
    for (const role of ["ADMIN", "USER"] as const) accounts.push(await db.user.create({ data: { name: `Ops ${role}`, email: `${randomUUID()}@example.test`, referralCode: randomUUID(), role, passwordHash, emailVerifiedAt: new Date(), twoFactorEnabled: true, twoFactorSecret: encrypt(secret) } }));
    administrator = accounts[0].id;
    await db.ledgerEntry.create({ data: { userId: accounts[1].id, amountCents: 12345, kind: "ISOLATED_FIXTURE", referenceId: randomUUID() } });
    server = createServer((await import("../server/app")).app); await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    const cookies = [];
    for (const account of accounts) {
      const response = await fetch(base + "/api/auth/login", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password, code: code() }) });
      expect(response.status).toBe(200); cookies.push(response.headers.get("set-cookie")!.split(";")[0]);
    }
    [adminCookie, userCookie] = cookies;
    operations = await import("../server/operations"); notifications = await import("../server/notifications");
  }, 30000);
  afterAll(async () => {
    server?.closeAllConnections(); if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    for (const name of createdDatabases) await native.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await native?.end(); if (db) await db.$disconnect(); if (directory) await rm(directory, { recursive: true, force: true });
  }, 30000);
  it("rejects anonymous, investor, wrong-origin and missing-TOTP requests", async () => {
    expect((await request("/", "GET", undefined, "")).status).toBe(401);
    expect((await request("/", "GET", undefined, userCookie)).status).toBe(403);
    expect((await request("/backup-key", "POST", { publicKey: keys.publicKey, recoveryKeySaved: true })).status).toBe(403);
    const response = await fetch(base + "/api/admin/operations/backup-key", { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json", Cookie: adminCookie }, body: JSON.stringify({ code: code(), publicKey: keys.publicKey, recoveryKeySaved: true }) });
    expect(response.status).toBe(403);
  });
  it("requires saved recovery confirmation, stores only the public key, and prevents accidental replacement", async () => {
    expect((await request("/backup-key", "POST", { code: code(), publicKey: keys.publicKey, recoveryKeySaved: false })).status).toBe(400);
    expect((await request("/backup-key", "POST", { code: code(), publicKey: keys.publicKey, recoveryKeySaved: true })).status).toBe(200);
    expect((await db.setting.findUniqueOrThrow({ where: { key: "backupPublicKey" } })).value).toBe(keys.publicKey);
    const other = generateKeyPairSync("rsa", { modulusLength: 3072, publicKeyEncoding: { format: "pem", type: "spki" } });
    expect((await request("/backup-key", "POST", { code: code(), publicKey: other.publicKey, recoveryKeySaved: true })).status).toBe(409);
    const status = await (await request("/")).json(); expect(status.backup.automaticEnabled).toBe(false);
    expect(JSON.stringify(status)).not.toContain(keys.privateKey);
  });
  it("creates one durable alert/email per condition, acknowledges it, and reopens after recovery", async () => {
    const finding = { key: "test-pending", severity: "INFO", title: "Isolated pending review", message: "One fixture requires review.", actionPath: "/admin/deposits", occurrences: 1 };
    await Promise.all([operations.synchronizeOperationalAlerts(db, [finding]), operations.synchronizeOperationalAlerts(db, [finding])]);
    expect(await db.emailOutbox.count({ where: { category: "OPERATIONS", subject: { contains: finding.title } } })).toBe(1);
    const alert = await db.operationalAlert.findUniqueOrThrow({ where: { key: finding.key } });
    expect((await request(`/alerts/${alert.id}/acknowledge`, "POST", { code: code() })).status).toBe(200);
    expect((await request(`/alerts/${alert.id}/acknowledge`, "POST", { code: code() })).status).toBe(409);
    await operations.synchronizeOperationalAlerts(db, [finding], new Date(Date.now() + 2 * 86400000));
    expect(await db.emailOutbox.count({ where: { category: "OPERATIONS", subject: { contains: finding.title } } })).toBe(1);
    await operations.synchronizeOperationalAlerts(db, []); await operations.synchronizeOperationalAlerts(db, [finding]);
    expect(await db.emailOutbox.count({ where: { category: "OPERATIONS", subject: { contains: finding.title } } })).toBe(2);
    expect((await db.operationalAlert.findUniqueOrThrow({ where: { key: finding.key } })).acknowledgedAt).toBeNull();
    expect(await db.auditLog.count({ where: { action: "OPS_ALERT_ACKNOWLEDGED", actorId: administrator } })).toBe(1);
  });
  it("detects repeated failed sign-ins and failed mail without feedback from its own alert emails", async () => {
    await db.auditLog.createMany({ data: Array.from({ length: 10 }, () => ({ action: "AUTH_LOGIN_FAILED" })) });
    await db.emailOutbox.create({ data: { recipient: "fixture@example.test", subject: "Fixture", text: "Fixture", attempts: 3 } });
    await db.emailOutbox.create({ data: { recipient: "fixture@example.test", subject: "Fixture operations", text: "Fixture", attempts: 3, category: "OPERATIONS" } });
    const findings = await operations.collectOperationalFindings(db);
    expect(findings.find(finding => finding.key === "failed-sign-ins")?.occurrences).toBe(10);
    expect(findings.find(finding => finding.key === "email-delivery")?.occurrences).toBe(1);
    expect(findings.some(finding => finding.key === "backup-coverage")).toBe(true);
    expect(() => notifications.queuedEmailMessage({ recipient: "fixture@example.test", subject: "Ops", text: "Fixture", category: "OPERATIONS", actionUrl: "https://attacker.example" })).toThrow();
  });
  it("prepares a real encrypted download with matching checksum and no false off-site success", async () => {
    const response = await request("/backups/download", "POST", { code: code() });
    expect(response.status).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 10).toString()).toBe("AUREONBK1\n");
    expect(bytes.includes(Buffer.from("ISOLATED_FIXTURE"))).toBe(false);
    const run = await db.backupRun.findFirstOrThrow({ where: { storage: "DOWNLOAD" } });
    expect(run.status).toBe("PREPARED"); expect(response.headers.get("X-Backup-SHA256")).toBe(run.sha256);
    expect(await db.backupRun.count({ where: { storage: "S3", status: "SUCCEEDED" } })).toBe(0);
  });
  it("cancels queued operational email when its recipient is no longer an administrator", async () => {
    const investor = await db.user.findFirstOrThrow({ where: { role: "USER" } });
    await db.emailOutbox.createMany({ data: Array.from({ length: 11 }, () => ({ recipient: "fixture@example.test", subject: "Old campaign fixture", text: "Fixture", category: "CAMPAIGN", createdAt: new Date("2020-01-01T00:00:00Z") })) });
    const job = await db.emailOutbox.create({ data: { recipient: investor.email, subject: "Isolated operations fixture", text: "Restricted operations notice", category: "OPERATIONS", actionUrl: "/admin/operations" } });
    await notifications.deliverNotificationEmails();
    const updated = await db.emailOutbox.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.cancelledAt).not.toBeNull(); expect(updated.sentAt).toBeNull(); expect(updated.attempts).toBe(1);
  });
  it("claims a daily backup only once across workers and retries a failed upload", async () => {
    const variables = ["BACKUP_S3_BUCKET", "BACKUP_S3_REGION", "BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY"];
    for (const key of variables) process.env[key] = "isolated-fixture";
    try {
      let uploads = 0;
      const upload = async () => { uploads++; };
      const outcomes = await Promise.all([scheduledBackup(db, new Date("2026-10-21T00:00:00Z"), upload), scheduledBackup(db, new Date("2026-10-21T00:00:00Z"), upload)]);
      expect(outcomes.filter(outcome => outcome.state === "succeeded")).toHaveLength(1); expect(uploads).toBe(1);
      expect((await scheduledBackup(db, new Date("2026-10-22T00:00:00Z"), async () => { throw new Error("Isolated storage failure"); })).state).toBe("failed");
      expect((await scheduledBackup(db, new Date("2026-10-22T00:20:00Z"), upload)).state).toBe("succeeded");
    } finally { for (const key of variables) delete process.env[key]; }
  }, 30000);
  it("restores a real archive into an empty disposable database and verifies ledger contents and every table count", async () => {
    const backup = await createDatabaseBackup(connectionString!, keys.publicKey);
    const target = new URL(connectionString!); const name = `aureon_${randomBytes(8).toString("hex")}_restore_test`;
    target.pathname = "/" + name; await native.query(`CREATE DATABASE "${name}"`); createdDatabases.push(name);
    const keyPath = join(directory, "recovery.pem"); await writeFile(keyPath, keys.privateKey, { mode: 0o600 });
    try {
      const result = await verifyRestore({ archive: backup.path, privateKey: keyPath, expectedSha256: backup.sha256, targetUrl: target.toString(), confirmDisposable: true });
      expect(result.tablesVerified).toBeGreaterThan(20); expect(result.ledgerVerified).toBe(true); expect(result.productionModified).toBe(false);
      await expect(verifyRestore({ archive: backup.path, privateKey: keyPath, expectedSha256: backup.sha256, targetUrl: target.toString(), confirmDisposable: true })).rejects.toThrow("empty");
      await expect(verifyRestore({ archive: backup.path, privateKey: keyPath, expectedSha256: "0".repeat(64), targetUrl: target.toString(), confirmDisposable: true })).rejects.toThrow("checksum");
      await expect(verifyRestore({ archive: backup.path, privateKey: keyPath, expectedSha256: backup.sha256, targetUrl: connectionString!, confirmDisposable: true })).rejects.toThrow();
    } finally { await rm(backup.directory, { recursive: true, force: true }); }
  }, 30000);
});
