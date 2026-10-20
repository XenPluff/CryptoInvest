import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { requireAuth, requireAdmin, requireTotp } from "./auth";
import { HttpError } from "./errors";
import { backupKeySetting, backupReadiness, createDatabaseBackup, scheduledBackup } from "./backups";
import { validateBackupPublicKey } from "./backup-crypto";
import { getEmailReadiness, checkEmailReadiness } from "./email-readiness";
import { config } from "./config";
import { emailProviderStatus } from "./mail";

type Finding = { key: string; severity: string; title: string; message: string; actionPath: string; occurrences: number };
/** Findings have fixed internal destinations and contain counts, never credentials or KYC data. */
export async function collectOperationalFindings(db: PrismaClient, now = new Date()): Promise<Finding[]> {
  const [deposits, withdrawals, transfers, identity, failedMail, failedLogins, backups, backupConfig, latestRun] = await Promise.all([
    db.transaction.count({ where: { type: "DEPOSIT", status: "PENDING" } }),
    db.transaction.count({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
    db.balanceTransfer.count({ where: { status: "PENDING" } }),
    db.kycSubmission.count({ where: { status: "PENDING" } }),
    db.emailOutbox.count({ where: { sentAt: null, cancelledAt: null, attempts: { gte: 3 }, category: { not: "OPERATIONS" } } }),
    db.auditLog.count({ where: { action: "AUTH_LOGIN_FAILED", createdAt: { gte: new Date(now.getTime() - 900000) } } }),
    db.backupRun.findFirst({ where: { storage: "S3", status: "SUCCEEDED" }, orderBy: { finishedAt: "desc" } }),
    backupReadiness(db),
    db.backupRun.findFirst({ where: { storage: "S3" }, orderBy: { startedAt: "desc" } }),
  ]);
  const findings: Finding[] = [];
  for (const [key, count, title, actionPath] of [
    ["pending-deposits", deposits, "Deposits awaiting review", "/admin/deposits"],
    ["pending-withdrawals", withdrawals, "Withdrawals awaiting review", "/admin/withdrawals"],
    ["pending-transfers", transfers, "Transfers awaiting review", "/admin/transfers"],
    ["pending-identity", identity, "Identity submissions awaiting review", "/admin/kyc"],
  ] as const) if (count) findings.push({ key, occurrences: count, severity: "INFO", title, message: `${count} pending request${count === 1 ? " requires" : "s require"} an administrator decision.`, actionPath });
  const readiness = getEmailReadiness();
  const delivery = emailProviderStatus();
  const recentFailure = Boolean(delivery.lastFailedAt && Date.parse(delivery.lastFailedAt) >= now.getTime() - 900000 && (!delivery.lastAcceptedAt || Date.parse(delivery.lastFailedAt) > Date.parse(delivery.lastAcceptedAt)));
  const emailIssue = recentFailure || !config.emailConfigured || (config.emailProvider === "brevo" && !["checks_passed", "checking", "not_checked"].includes(readiness.status));
  if (failedMail || emailIssue) findings.push({ key: "email-delivery", severity: "CRITICAL", title: "Email delivery needs attention", message: failedMail ? `${failedMail} queued message${failedMail === 1 ? " has" : "s have"} failed at least three delivery attempts. Check the delivery settings.` : recentFailure ? "A recent email handoff failed. Check delivery settings and the provider before retrying account mail." : "The email provider readiness check is not passing. Check its configuration and sender status.", actionPath: "/admin/settings", occurrences: Math.max(failedMail, 1) });
  if (failedLogins >= 10) findings.push({ key: "failed-sign-ins", severity: "WARNING", title: "Repeated unsuccessful sign-ins", message: `${failedLogins} unsuccessful password or authenticator sign-in attempts were recorded in the last 15 minutes. Review the audit trail. This signal does not establish a compromised account.`, actionPath: "/admin/audit", occurrences: failedLogins });
  if (!backupConfig.automaticEnabled) findings.push({ key: "backup-coverage", severity: "WARNING", title: "Automatic backups need setup", message: "Configure an encryption public key and private storage to enable daily off-site backups. Manual encrypted downloads are available once the key is saved.", actionPath: "/admin/operations", occurrences: 1 });
  else if (!backups?.finishedAt || backups.finishedAt.getTime() < now.getTime() - 36 * 3600000) findings.push({ key: "backup-coverage", severity: "CRITICAL", title: "No recent verified off-site backup", message: "No uploaded and checksum-verified backup has completed in the last 36 hours. Check backup history and storage settings.", actionPath: "/admin/operations", occurrences: 1 });
  if (backupConfig.automaticEnabled && latestRun && (latestRun.status === "FAILED" || (latestRun.status === "RUNNING" && latestRun.startedAt.getTime() < now.getTime() - 3600000))) findings.push({ key: "backup-failure", severity: "CRITICAL", title: "Automatic backup did not finish", message: "The latest scheduled archive failed or was interrupted. Check its recorded status and private storage settings.", actionPath: "/admin/operations", occurrences: 1 });
  return findings;
}
export async function synchronizeOperationalAlerts(db: PrismaClient, findings: Finding[], now = new Date()) {
  await db.$transaction(async tx => {
    // One updater at a time; creation, administrator notifications, and outbox commit together.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(482119731)`;
    const administrators = await tx.user.findMany({ where: { role: "ADMIN", suspended: false, emailVerifiedAt: { not: null } }, select: { id: true, email: true } });
    for (const finding of findings) {
      const current = await tx.operationalAlert.findUnique({ where: { key: finding.key } });
      const reopened = !current || Boolean(current.resolvedAt);
      const escalated = current && finding.severity === "CRITICAL" && current.severity !== "CRITICAL";
      const reminder = current && !current.acknowledgedAt && (!current.lastNotifiedAt || current.lastNotifiedAt.getTime() < now.getTime() - 86400000);
      const notify = reopened || escalated || reminder;
      await tx.operationalAlert.upsert({ where: { key: finding.key }, create: { ...finding, openedAt: now, lastSeenAt: now, lastNotifiedAt: now }, update: { ...finding, lastSeenAt: now, resolvedAt: null, ...(notify ? { lastNotifiedAt: now } : {}), ...(reopened || escalated ? { openedAt: now, acknowledgedAt: null, acknowledgedById: null } : {}) } });
      if (notify) for (const admin of administrators) {
        await tx.notification.create({ data: { userId: admin.id, title: finding.title, message: `${finding.message} View Operations in your administrator workspace.` } });
        await tx.emailOutbox.create({ data: { recipient: admin.email, subject: `AUREON Operations | ${finding.title}`, text: finding.message, category: "OPERATIONS", actionUrl: finding.actionPath } });
      }
    }
    await tx.operationalAlert.updateMany({ where: { resolvedAt: null, key: { notIn: findings.map(finding => finding.key) } }, data: { resolvedAt: now } });
  }, { timeout: 20000 });
}
let checking = false;
export async function checkOperations(db = prisma) {
  if (checking) return;
  checking = true;
  try { await synchronizeOperationalAlerts(db, await collectOperationalFindings(db)); }
  finally { checking = false; }
}
export function startOperationsWorker() {
  let stopped = false; let running = false; let lastProviderCheck = 0; let lastBackupCheck = 0;
  const run = async () => {
    if (running || stopped) return;
    running = true;
    try {
      if (Date.now() - lastProviderCheck >= 15 * 60000) { lastProviderCheck = Date.now(); await checkEmailReadiness(); }
      await checkOperations();
      if (Date.now() - lastBackupCheck >= 15 * 60000) { lastBackupCheck = Date.now(); await scheduledBackup(prisma); }
    } catch { console.error("Operations check failed. Check database connectivity and operational settings."); }
    finally { running = false; }
  };
  void run(); const timer = setInterval(() => void run(), 60000); timer.unref();
  return () => { stopped = true; clearInterval(timer); };
}
export const operationsRouter = Router();
operationsRouter.use(requireAuth, requireAdmin);
operationsRouter.use((req, _res, next) => {
  if (!req.auth!.user.twoFactorEnabled) return next(new HttpError(403, "Enable an authenticator before accessing operations."));
  next();
});
operationsRouter.get("/", async (_req, res) => {
  const [alerts, backups, backup, latestVerifiedBackup] = await Promise.all([
    prisma.operationalAlert.findMany({ orderBy: [{ resolvedAt: { sort: "desc", nulls: "first" } }, { openedAt: "desc" }], take: 50 }),
    prisma.backupRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    backupReadiness(prisma),
    prisma.backupRun.findFirst({ where: { storage: "S3", status: "SUCCEEDED" }, orderBy: { finishedAt: "desc" } }),
  ]);
  res.json({ alerts, backups, backup, latestVerifiedBackup, monitoring: { internalIntervalSeconds: 60, emailReadinessIntervalMinutes: 15, externalMonitor: "GitHub Actions: independent public health checks; delivery uses repository notifications." } });
});
operationsRouter.post("/alerts/:id/acknowledge", async (req, res) => {
  await requireTotp(req.auth!.user, req.body.code);
  const id = z.string().max(200).parse(req.params.id);
  await prisma.$transaction(async tx => {
    const updated = await tx.operationalAlert.updateMany({ where: { id, resolvedAt: null, acknowledgedAt: null }, data: { acknowledgedAt: new Date(), acknowledgedById: req.auth!.user.id } });
    if (!updated.count) throw new HttpError(409, "The alert has already been acknowledged or resolved. Reload operations.");
    await tx.auditLog.create({ data: { actorId: req.auth!.user.id, action: "OPS_ALERT_ACKNOWLEDGED", targetId: id, ip: req.ip } });
  });
  res.json({ message: "Alert acknowledged. The underlying condition continues to be monitored." });
});
operationsRouter.post("/backup-key", async (req, res) => {
  await requireTotp(req.auth!.user, req.body.code);
  const { publicKey, recoveryKeySaved } = z.object({ publicKey: z.string().max(8192), recoveryKeySaved: z.literal(true) }).parse(req.body);
  let fingerprint: string;
  try { fingerprint = validateBackupPublicKey(publicKey).fingerprint; }
  catch { throw new HttpError(400, "Use the RSA public key generated by the recovery kit (3072 bits or stronger)."); }
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(482119732)`;
    const existing = await tx.setting.findUnique({ where: { key: backupKeySetting } });
    if (existing && existing.value !== publicKey) throw new HttpError(409, "A backup encryption key is already configured. Keep its recovery key; rotation requires an operator recovery procedure.");
    await tx.setting.upsert({ where: { key: backupKeySetting }, create: { key: backupKeySetting, value: publicKey }, update: {} });
    await tx.auditLog.create({ data: { actorId: req.auth!.user.id, action: "BACKUP_ENCRYPTION_CONFIGURED", metadata: { fingerprint }, ip: req.ip } });
  });
  res.json({ fingerprint });
});
operationsRouter.post("/backups/download", rateLimit({ windowMs: 3600000, limit: 3, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
  await requireTotp(req.auth!.user, req.body.code);
  const publicPem = (await prisma.setting.findUnique({ where: { key: backupKeySetting } }))?.value;
  if (!publicPem) throw new HttpError(409, "Create and save your recovery kit before requesting a backup.");
  const { fingerprint } = validateBackupPublicKey(publicPem);
  const run = await prisma.backupRun.create({ data: { slot: `download:${randomUUID()}`, storage: "DOWNLOAD", keyFingerprint: fingerprint } });
  let backup: Awaited<ReturnType<typeof createDatabaseBackup>> | undefined;
  try {
    backup = await createDatabaseBackup(process.env.DATABASE_URL!, publicPem);
    await prisma.$transaction([
      prisma.backupRun.update({ where: { id: run.id }, data: { status: "PREPARED", sha256: backup.sha256, sizeBytes: backup.sizeBytes, finishedAt: new Date() } }),
      prisma.auditLog.create({ data: { actorId: req.auth!.user.id, action: "BACKUP_DOWNLOAD_PREPARED", targetId: run.id, metadata: { sha256: backup.sha256, fingerprint }, ip: req.ip } }),
    ]);
    const directory = backup.directory;
    res.set("X-Backup-SHA256", backup.sha256);
    res.download(backup.path, `aureon-${new Date().toISOString().slice(0, 10)}-${run.id}.aureon`, error => {
      void rm(directory, { recursive: true, force: true });
      if (error && !res.headersSent) res.status(500).json({ error: "The backup download did not finish. Request another archive." });
    });
  } catch {
    if (backup) await rm(backup.directory, { recursive: true, force: true });
    await prisma.backupRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: "Encrypted backup preparation failed. Check database tools and retry." } });
    throw new HttpError(503, "The encrypted backup could not be prepared. Check operations and try again later.");
  }
});
