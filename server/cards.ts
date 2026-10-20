import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "./db";
import { requireAdmin, requireAuth, requireTotp, requireVerified } from "./auth";
import { audit, serializable } from "./finance";
import { HttpError } from "./errors";
import { CARD_CONSENT_VERSION, CARD_PROGRAM } from "../lib/cards";

const statuses = ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED", "DECLINED", "WITHDRAWN"] as const;
const applicantSelect = {
  id: true, network: true, format: true, country: true, intendedUse: true,
  status: true, version: true, consentVersion: true, consentedAt: true,
  submittedAt: true, updatedAt: true, reviewedAt: true, reviewMessage: true,
  events: { orderBy: { version: "desc" as const }, take: 30, select: { id: true, status: true, message: true, createdAt: true } },
};
const limited = (limit: number) => rateLimit({ windowMs: 3600000, limit, keyGenerator: req => req.auth!.user.id, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many card application requests. Please try again later." } });
const applicationSchema = z.object({
  network: z.enum(["VISA", "MASTERCARD"]),
  format: z.enum(["PHYSICAL", "VIRTUAL"]),
  country: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M} .,'’()\-]+$/u, "Enter a country name, without account or identity numbers."),
  intendedUse: z.enum(["PERSONAL", "BUSINESS", "BOTH"]),
  consentVersion: z.literal(CARD_CONSENT_VERSION),
  acknowledgePrelaunch: z.literal(true),
  acknowledgePrivacy: z.literal(true),
  confirmAdult: z.literal(true),
}).strict();

export const cardUserRouter = Router();
cardUserRouter.use(requireAuth);
cardUserRouter.get("/", async (req, res) => {
  const application = await prisma.cardApplication.findUnique({ where: { userId: req.auth!.user.id }, select: applicantSelect });
  res.json({ program: CARD_PROGRAM, application });
});

cardUserRouter.post("/applications", requireVerified, limited(5), async (req, res) => {
  const input = applicationSchema.parse(req.body);
  const actorId = req.auth!.user.id;
  const application = await serializable(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
    const currentUser = await tx.user.findUnique({ where: { id: actorId } });
    if (!currentUser || currentUser.suspended || !currentUser.emailVerifiedAt) throw new HttpError(403, "An active account with verified email is required.");
    const existing = await tx.cardApplication.findUnique({ where: { userId: actorId } });
    if (existing && !["DECLINED", "WITHDRAWN"].includes(existing.status)) throw new HttpError(409, "You already have an active pre-launch application. Track it or withdraw it before applying again.");
    const now = new Date();
    const data = { network: input.network, format: input.format, country: input.country, intendedUse: input.intendedUse, consentVersion: input.consentVersion, consentedAt: now, submittedAt: now, status: "SUBMITTED" as const, reviewedAt: null, reviewedById: null, reviewMessage: null };
    const record = existing
      ? await tx.cardApplication.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } })
      : await tx.cardApplication.create({ data: { ...data, userId: actorId } });
    await tx.cardApplicationEvent.create({ data: { applicationId: record.id, actorId, status: record.status, version: record.version, message: "Pre-launch application recorded. No card, credit decision or payment facility has been issued." } });
    await audit(tx, actorId, "CARD_APPLICATION_SUBMITTED", record.id, { network: record.network, format: record.format, version: record.version, consentVersion: record.consentVersion }, req.ip);
    await tx.notification.create({ data: { userId: actorId, title: "Card application recorded", message: "Track your pre-launch application in Cards. This is not a credit approval or an issued card." } });
    const administrators = await tx.user.findMany({ where: { role: "ADMIN", suspended: false, emailVerifiedAt: { not: null } }, select: { id: true } });
    if (administrators.length) await tx.notification.createMany({ data: administrators.map(user => ({ userId: user.id, title: "New card application", message: "A pre-launch card application is ready in Card applications. No credit approval or card issuance is authorized." })) });
    return tx.cardApplication.findUniqueOrThrow({ where: { id: record.id }, select: applicantSelect });
  });
  res.status(201).json({ program: CARD_PROGRAM, application });
});

cardUserRouter.post("/applications/:id/withdraw", limited(10), async (req, res) => {
  const { version } = z.object({ version: z.number().int().positive() }).strict().parse(req.body);
  const id = String(req.params.id), actorId = req.auth!.user.id;
  const application = await serializable(async tx => {
    const record = await tx.cardApplication.findFirst({ where: { id, userId: actorId } });
    if (!record) throw new HttpError(404, "Application not found.");
    if (record.version !== version || ["DECLINED", "WITHDRAWN"].includes(record.status)) throw new HttpError(409, "This application changed or is already closed. Reload its status.");
    const changed = await tx.cardApplication.updateMany({ where: { id, userId: actorId, version }, data: { status: "WITHDRAWN", version: { increment: 1 }, reviewMessage: "Withdrawn by the applicant." } });
    if (changed.count !== 1) throw new HttpError(409, "The application changed. Reload its status.");
    await tx.cardApplicationEvent.create({ data: { applicationId: id, actorId, status: "WITHDRAWN", version: version + 1, message: "Application withdrawn by the applicant. Historical records are retained." } });
    await audit(tx, actorId, "CARD_APPLICATION_WITHDRAWN", id, { version: version + 1 }, req.ip);
    return tx.cardApplication.findUniqueOrThrow({ where: { id }, select: applicantSelect });
  });
  res.json({ application });
});

export const cardAdminRouter = Router();
cardAdminRouter.use(requireAuth, requireAdmin, limited(150));
cardAdminRouter.get("/", async (req, res) => {
  const query = z.object({ status: z.enum(statuses).optional(), q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict().parse(req.query);
  const where = { ...(query.status ? { status: query.status } : {}), ...(query.q ? { user: { OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { email: { contains: query.q, mode: "insensitive" as const } }] } } : {}) };
  const [total, applications] = await prisma.$transaction([
    prisma.cardApplication.count({ where }),
    prisma.cardApplication.findMany({ where, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], take: 25, skip: (query.page - 1) * 25, select: { ...applicantSelect, user: { select: { id: true, name: true, email: true, emailVerifiedAt: true, suspended: true, kyc: { select: { status: true } } } } } }),
  ]);
  res.json({ program: CARD_PROGRAM, applications, total, page: query.page, pageSize: 25 });
});

cardAdminRouter.post("/:id/review", async (req, res) => {
  const input = z.object({ status: z.enum(["UNDER_REVIEW", "WAITLISTED", "DECLINED"]), message: z.string().trim().min(10).max(500), version: z.number().int().positive(), code: z.string().regex(/^\d{6}$/) }).strict().parse(req.body);
  await requireTotp(req.auth!.user, input.code);
  const id = String(req.params.id), actorId = req.auth!.user.id;
  const application = await serializable(async tx => {
    const record = await tx.cardApplication.findUnique({ where: { id }, include: { user: { select: { suspended: true } } } });
    if (!record) throw new HttpError(404, "Application not found.");
    if (record.userId === actorId) throw new HttpError(403, "Another administrator must review your application.");
    if (record.user.suspended) throw new HttpError(409, "This applicant's account is suspended.");
    if (record.version !== input.version || !["SUBMITTED", "UNDER_REVIEW"].includes(record.status)) throw new HttpError(409, "This application changed or its preliminary review is closed. Reload the queue.");
    if (record.status === input.status) throw new HttpError(409, "The application already has this status.");
    const changed = await tx.cardApplication.updateMany({ where: { id, version: input.version, status: record.status }, data: { status: input.status, version: { increment: 1 }, reviewedById: actorId, reviewedAt: new Date(), reviewMessage: input.message } });
    if (changed.count !== 1) throw new HttpError(409, "Another reviewer changed this application. Reload the queue.");
    await tx.cardApplicationEvent.create({ data: { applicationId: id, actorId, status: input.status, version: record.version + 1, message: input.message } });
    await audit(tx, actorId, "CARD_APPLICATION_REVIEWED", id, { fromStatus: record.status, toStatus: input.status, version: record.version + 1 }, req.ip);
    await tx.notification.create({ data: { userId: record.userId, title: "Card application updated", message: "Read the preliminary review outcome in Cards. A review does not issue a card or approve credit." } });
    return tx.cardApplication.findUniqueOrThrow({ where: { id }, select: applicantSelect });
  });
  res.json({ application });
});
