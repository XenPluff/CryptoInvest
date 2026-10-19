import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "./db";
import { requireAuth, requireAdmin, requireTotp } from "./auth";
import { HttpError } from "./errors";
import { audit, serializable } from "./finance";
import { config } from "./config";
import { emailConfigured } from "./mail";
import { decrypt, encrypt, randomToken, tokenHash } from "./crypto";

const kindSchema = z.enum(["ARTICLE", "ANNOUNCEMENT", "FAQ"]);
export const contentInputSchema = z
  .object({
    kind: kindSchema,
    slug: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use a lowercase, hyphen-separated URL slug.",
      ),
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().min(3).max(500),
    body: z.string().trim().min(10).max(20000),
  })
  .strict();
export const campaignInputSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    subject: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .refine(
        (value) => !/[\r\n]/.test(value),
        "Email subjects must use one line.",
      ),
    message: z.string().trim().min(20).max(12000),
  })
  .strict();
export const subscriptionInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    consent: z.literal(true, {
      error: "Confirm that you agree to receive the AUREON newsletter.",
    }),
  })
  .strict();
const tokenSchema = z
  .object({
    token: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/, "This link is invalid or expired."),
  })
  .strict();
function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues[0]?.message || "Invalid request.",
    );
  return result.data;
}
const id = (req: Request) => String(req.params.id);
const publicSelection = {
  id: true,
  kind: true,
  slug: true,
  title: true,
  summary: true,
  publishedAt: true,
  updatedAt: true,
} as const;
const newsletterMessage =
  "If your email is eligible, a confirmation link will arrive shortly. You will receive the newsletter only after confirming.";
export const contentPublicRouter = Router();
const newsletterLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

contentPublicRouter.get("/content", async (req, res) => {
  const kind =
    req.query.kind === undefined
      ? undefined
      : input(kindSchema, req.query.kind);
  const limit =
    req.query.limit === undefined
      ? 20
      : input(z.coerce.number().int().min(1).max(50), req.query.limit);
  const entries = await prisma.contentEntry.findMany({
    where: { status: "PUBLISHED", ...(kind ? { kind } : {}) },
    select: publicSelection,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  res.json({ entries });
});
contentPublicRouter.get("/content/:slug", async (req, res) => {
  const entry = await prisma.contentEntry.findFirst({
    where: { slug: String(req.params.slug), status: "PUBLISHED" },
    select: { ...publicSelection, body: true },
  });
  if (!entry) throw new HttpError(404, "This publication could not be found.");
  res.json({ entry });
});
contentPublicRouter.post("/newsletter", newsletterLimit, async (req, res) => {
  const data = input(subscriptionInputSchema, req.body);
  if (!emailConfigured)
    throw new HttpError(
      503,
      "Newsletter confirmation email is not configured. Please try again later.",
    );
  await serializable(async (tx) => {
    const existing = await tx.newsletterSubscriber.findUnique({
      where: { email: data.email },
    });
    if (existing?.confirmedAt && !existing.unsubscribedAt) return;
    // Resends are spaced out and never expose whether an address is already subscribed.
    if (
      existing?.consentAt &&
      !existing.unsubscribedAt &&
      Date.now() - existing.consentAt.getTime() < 60000
    )
      return;
    const token = randomToken();
    const subscriber = await tx.newsletterSubscriber.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        consentAt: new Date(),
        consentVersion: "newsletter-v1",
        confirmTokenHash: tokenHash(token),
        confirmExpiresAt: new Date(Date.now() + 86400000),
      },
      update: {
        consentAt: new Date(),
        consentVersion: "newsletter-v1",
        confirmedAt: null,
        unsubscribedAt: null,
        confirmTokenHash: tokenHash(token),
        confirmExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    const link = new URL("/newsletter/confirm", config.appOrigin);
    link.searchParams.set("token", token);
    await tx.emailOutbox.create({
      data: {
        recipient: subscriber.email,
        subject: "Confirm your AUREON newsletter subscription",
        text: "You requested occasional AUREON insights and announcements. Confirm your subscription using the link below. This link expires in 24 hours. If you did not request this, ignore this message.",
        category: "NEWSLETTER_CONFIRMATION",
        actionUrl: link.toString(),
        newsletterSubscriberId: subscriber.id,
      },
    });
  });
  res.status(202).json({ message: newsletterMessage });
});
contentPublicRouter.post(
  "/newsletter/confirm",
  newsletterLimit,
  async (req, res) => {
    const { token } = input(tokenSchema, req.body);
    await serializable(async (tx) => {
      const subscriber = await tx.newsletterSubscriber.findUnique({
        where: { confirmTokenHash: tokenHash(token) },
      });
      if (
        !subscriber ||
        !subscriber.consentAt ||
        !subscriber.confirmExpiresAt ||
        subscriber.confirmExpiresAt <= new Date() ||
        subscriber.unsubscribedAt
      )
        throw new HttpError(
          400,
          "This confirmation link is invalid or expired. Subscribe again for a new link.",
        );
      const unsubscribeToken = randomToken();
      await tx.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: {
          confirmedAt: new Date(),
          confirmTokenHash: null,
          confirmExpiresAt: null,
          unsubscribeTokenHash: tokenHash(unsubscribeToken),
          encryptedUnsubscribeToken: encrypt(unsubscribeToken),
        },
      });
      await tx.auditLog.create({
        data: {
          action: "NEWSLETTER_CONFIRMED",
          targetId: subscriber.id,
          ip: req.ip,
          metadata: { consentVersion: subscriber.consentVersion },
        },
      });
    });
    res.json({
      message:
        "Your newsletter subscription is confirmed. You can unsubscribe using the link in any newsletter.",
    });
  },
);
contentPublicRouter.post(
  "/newsletter/unsubscribe",
  newsletterLimit,
  async (req, res) => {
    const { token } = input(tokenSchema, req.body);
    await serializable(async (tx) => {
      const subscriber = await tx.newsletterSubscriber.findUnique({
        where: { unsubscribeTokenHash: tokenHash(token) },
      });
      if (!subscriber)
        throw new HttpError(
          400,
          "This unsubscribe link is invalid. Please contact support for help.",
        );
      if (!subscriber.unsubscribedAt) {
        await tx.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: {
            unsubscribedAt: new Date(),
            confirmedAt: null,
            confirmTokenHash: null,
            confirmExpiresAt: null,
          },
        });
        await tx.emailOutbox.updateMany({
          where: {
            newsletterSubscriberId: subscriber.id,
            sentAt: null,
            cancelledAt: null,
          },
          data: {
            cancelledAt: new Date(),
            lastError: "Cancelled after consent was withdrawn.",
          },
        });
        await tx.auditLog.create({
          data: {
            action: "NEWSLETTER_UNSUBSCRIBED",
            targetId: subscriber.id,
            ip: req.ip,
          },
        });
      }
    });
    res.json({
      message: "You have been unsubscribed from the AUREON newsletter.",
    });
  },
);

export const contentAdminRouter = Router();
contentAdminRouter.use(requireAuth, requireAdmin);
contentAdminRouter.get("/content", async (_req, res) => {
  res.json({
    entries: await prisma.contentEntry.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  });
});
contentAdminRouter.post("/content", async (req, res) => {
  const data = input(contentInputSchema, req.body);
  const entry = await serializable(async (tx) => {
    const created = await tx.contentEntry.create({
      data: {
        ...data,
        createdById: req.auth!.user.id,
        updatedById: req.auth!.user.id,
      },
    });
    await audit(
      tx,
      req.auth!.user.id,
      "CONTENT_DRAFT_CREATED",
      created.id,
      { kind: data.kind, title: data.title },
      req.ip,
    );
    return created;
  });
  res
    .status(201)
    .json({
      entry,
      message: "Draft saved. It is visible only to administrators.",
    });
});
contentAdminRouter.patch("/content/:id", async (req, res) => {
  const data = input(contentInputSchema, req.body);
  const entry = await serializable(async (tx) => {
    const existing = await tx.contentEntry.findUnique({
      where: { id: id(req) },
    });
    if (!existing) throw new HttpError(404, "Content was not found.");
    if (existing.status !== "DRAFT")
      throw new HttpError(
        409,
        "Move this publication to draft before editing it.",
      );
    const updated = await tx.contentEntry.update({
      where: { id: existing.id },
      data: { ...data, updatedById: req.auth!.user.id },
    });
    await audit(
      tx,
      req.auth!.user.id,
      "CONTENT_DRAFT_UPDATED",
      existing.id,
      { kind: data.kind, title: data.title },
      req.ip,
    );
    return updated;
  });
  res.json({ entry, message: "Draft updated." });
});
contentAdminRouter.post("/content/:id/status", async (req, res) => {
  const data = input(
    z
      .object({
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
        code: z.string().optional(),
      })
      .strict(),
    req.body,
  );
  await requireTotp(req.auth!.user, data.code);
  const entry = await serializable(async (tx) => {
    const existing = await tx.contentEntry.findUnique({
      where: { id: id(req) },
    });
    if (!existing) throw new HttpError(404, "Content was not found.");
    if (data.status === "PUBLISHED")
      input(contentInputSchema, {
        kind: existing.kind,
        slug: existing.slug,
        title: existing.title,
        summary: existing.summary,
        body: existing.body,
      });
    const updated = await tx.contentEntry.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        ...(data.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        updatedById: req.auth!.user.id,
      },
    });
    await audit(
      tx,
      req.auth!.user.id,
      `CONTENT_${data.status}`,
      existing.id,
      { previousStatus: existing.status, title: existing.title },
      req.ip,
    );
    return updated;
  });
  res.json({
    entry,
    message:
      data.status === "PUBLISHED"
        ? "Content published."
        : `Content moved to ${data.status.toLowerCase()}.`,
  });
});
contentAdminRouter.get("/campaigns", async (_req, res) => {
  const [campaigns, confirmed, pending, unsubscribed] = await Promise.all([
    prisma.emailCampaign.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { _count: { select: { recipients: true } } },
    }),
    prisma.newsletterSubscriber.count({
      where: { confirmedAt: { not: null }, unsubscribedAt: null },
    }),
    prisma.newsletterSubscriber.count({
      where: { confirmedAt: null, unsubscribedAt: null },
    }),
    prisma.newsletterSubscriber.count({
      where: { unsubscribedAt: { not: null } },
    }),
  ]);
  res.json({
    campaigns,
    subscriberCounts: { confirmed, pending, unsubscribed },
    emailConfigured,
  });
});
contentAdminRouter.post("/campaigns", async (req, res) => {
  const data = input(campaignInputSchema, req.body);
  const campaign = await serializable(async (tx) => {
    const created = await tx.emailCampaign.create({
      data: {
        ...data,
        createdById: req.auth!.user.id,
        updatedById: req.auth!.user.id,
      },
    });
    await audit(
      tx,
      req.auth!.user.id,
      "CAMPAIGN_DRAFT_CREATED",
      created.id,
      { title: data.title },
      req.ip,
    );
    return created;
  });
  res
    .status(201)
    .json({
      campaign,
      message: "Campaign draft saved. No messages have been queued.",
    });
});
contentAdminRouter.patch("/campaigns/:id", async (req, res) => {
  const data = input(campaignInputSchema, req.body);
  const campaign = await serializable(async (tx) => {
    const existing = await tx.emailCampaign.findUnique({
      where: { id: id(req) },
    });
    if (!existing) throw new HttpError(404, "Campaign was not found.");
    if (existing.status !== "DRAFT")
      throw new HttpError(
        409,
        "A campaign cannot be edited after messages are queued. Create a new draft.",
      );
    const updated = await tx.emailCampaign.update({
      where: { id: existing.id },
      data: { ...data, updatedById: req.auth!.user.id },
    });
    await audit(
      tx,
      req.auth!.user.id,
      "CAMPAIGN_DRAFT_UPDATED",
      existing.id,
      { title: data.title },
      req.ip,
    );
    return updated;
  });
  res.json({ campaign, message: "Campaign draft updated." });
});
contentAdminRouter.post("/campaigns/:id/queue", async (req, res) => {
  const data = input(
    z
      .object({
        confirmation: z.literal("QUEUE CAMPAIGN"),
        code: z.string().optional(),
        batchSize: z.number().int().min(1).max(100).default(100),
      })
      .strict(),
    req.body,
  );
  await requireTotp(req.auth!.user, data.code);
  if (!emailConfigured)
    throw new HttpError(
      503,
      "Configure and verify an email provider before queuing a campaign.",
    );
  const queued = await serializable(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "EmailCampaign" WHERE id = ${id(req)} FOR UPDATE`;
    const campaign = await tx.emailCampaign.findUnique({
      where: { id: id(req) },
    });
    if (!campaign) throw new HttpError(404, "Campaign was not found.");
    if (campaign.status === "ARCHIVED")
      throw new HttpError(409, "Archived campaigns cannot queue messages.");
    const subscribers = await tx.newsletterSubscriber.findMany({
      where: {
        confirmedAt: { not: null },
        unsubscribedAt: null,
        encryptedUnsubscribeToken: { not: null },
        campaignRecipients: { none: { campaignId: campaign.id } },
      },
      orderBy: { id: "asc" },
      take: data.batchSize,
    });
    for (const subscriber of subscribers) {
      const unsubscribeToken = decrypt(subscriber.encryptedUnsubscribeToken!);
      if (tokenHash(unsubscribeToken) !== subscriber.unsubscribeTokenHash)
        throw new HttpError(
          409,
          "A subscriber consent record needs operator review before queuing.",
        );
      const link = new URL("/newsletter/unsubscribe", config.appOrigin);
      link.searchParams.set("token", unsubscribeToken);
      const recipient = await tx.campaignRecipient.create({
        data: { campaignId: campaign.id, subscriberId: subscriber.id },
      });
      await tx.emailOutbox.create({
        data: {
          recipient: subscriber.email,
          subject: campaign.subject,
          text: campaign.message,
          category: "CAMPAIGN",
          actionUrl: link.toString(),
          newsletterSubscriberId: subscriber.id,
          campaignRecipientId: recipient.id,
        },
      });
    }
    if (subscribers.length)
      await tx.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "QUEUED", updatedById: req.auth!.user.id },
      });
    await audit(
      tx,
      req.auth!.user.id,
      "CAMPAIGN_BATCH_QUEUED",
      campaign.id,
      { count: subscribers.length, batchSize: data.batchSize },
      req.ip,
    );
    return subscribers.length;
  });
  res.json({
    queued,
    message: queued
      ? `${queued} messages queued for the delivery worker. Queue another confirmed batch if needed. Provider acceptance does not guarantee inbox delivery.`
      : "There are no remaining confirmed subscribers for this campaign.",
  });
});
contentAdminRouter.post("/campaigns/:id/archive", async (req, res) => {
  const { code } = input(
    z.object({ code: z.string().optional() }).strict(),
    req.body,
  );
  await requireTotp(req.auth!.user, code);
  await serializable(async (tx) => {
    const campaign = await tx.emailCampaign.findUnique({
      where: { id: id(req) },
    });
    if (!campaign) throw new HttpError(404, "Campaign was not found.");
    await tx.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: "ARCHIVED", updatedById: req.auth!.user.id },
    });
    // Pending emails are cancelled atomically; accepted messages cannot be recalled.
    const recipients = await tx.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { id: true },
    });
    await tx.emailOutbox.updateMany({
      where: {
        campaignRecipientId: { in: recipients.map((row) => row.id) },
        sentAt: null,
        cancelledAt: null,
      },
      data: {
        cancelledAt: new Date(),
        lastError: "Campaign archived by operator.",
      },
    });
    await audit(
      tx,
      req.auth!.user.id,
      "CAMPAIGN_ARCHIVED",
      campaign.id,
      {},
      req.ip,
    );
  });
  res.json({
    message:
      "Campaign archived. Pending messages were cancelled; messages already accepted by the provider cannot be recalled.",
  });
});
