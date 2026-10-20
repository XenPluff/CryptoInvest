import { Prisma, EmailOutbox } from "@prisma/client";
import { prisma } from "./db";
import { emailConfigured, sendEmail, actionEmail } from "./mail";
import { config } from "./config";
import { tokenHash } from "./crypto";
export async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  title: string,
  message: string,
) {
  const notification = await tx.notification.create({
    data: { userId, title, message },
  });
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerifiedAt: true },
  });
  if (user?.emailVerifiedAt)
    await tx.emailOutbox.create({
      data: {
        notificationId: notification.id,
        recipient: user.email,
        subject: `AUREON | ${title}`,
        text: message,
      },
    });
  return notification;
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
/** Only server-created same-origin newsletter links are permitted in queued templates. */
export function newsletterActionUrl(
  value: string | null,
  category: string,
): URL {
  const url = new URL(value || "", config.appOrigin);
  const expected =
    category === "CAMPAIGN" ? "/newsletter/unsubscribe" : "/newsletter/confirm";
  if (
    url.origin !== new URL(config.appOrigin).origin ||
    url.pathname !== expected ||
    !/^[-_A-Za-z0-9]{43}$/.test(url.searchParams.get("token") || "")
  )
    throw new Error("Invalid queued newsletter link.");
  return url;
}
export function queuedEmailMessage(
  job: Pick<
    EmailOutbox,
    "recipient" | "subject" | "text" | "category" | "actionUrl"
  >,
) {
  if (job.category === "OPERATIONS") {
    const paths = ["/admin/operations", "/admin/deposits", "/admin/withdrawals", "/admin/transfers", "/admin/kyc", "/admin/settings", "/admin/audit"];
    if (!job.actionUrl || !paths.includes(job.actionUrl)) throw new Error("Invalid operations destination.");
    const url = `${config.appOrigin}${job.actionUrl}`;
    return { to: job.recipient, subject: job.subject, text: `${job.text}\n\nReview operations: ${url}\n\nSign in through your trusted AUREON address. Never share authentication codes.`, html: actionEmail({ title: job.subject.replace(/^AUREON Operations \| /, ""), description: job.text, button: "Review operations", url, expiry: "This operational notice contains no account credentials or identity documents.", unsolicited: "Review the current status in your administrator workspace before taking action." }) };
  }
  if (job.category === "ACTIVITY")
    return {
      to: job.recipient,
      subject: job.subject,
      text: `${job.text}\n\nView your account: ${config.appOrigin}/dashboard\n\nNever share your password or authentication codes.`,
      html: actionEmail({
        title: job.subject.replace(/^AUREON \| /, ""),
        description: job.text,
        button: "View your account",
        url: `${config.appOrigin}/dashboard`,
        expiry: "Review the transaction details in your account.",
        unsolicited:
          "If you do not recognize this activity, contact support and secure your account immediately.",
      }),
    };
  if (!["CAMPAIGN", "NEWSLETTER_CONFIRMATION"].includes(job.category))
    throw new Error("Unsupported email category.");
  const url = newsletterActionUrl(job.actionUrl, job.category).toString();
  const campaign = job.category === "CAMPAIGN";
  const action = campaign
    ? "Unsubscribe from the newsletter"
    : "Confirm newsletter subscription";
  const footer = campaign
    ? "You are receiving this email because you confirmed your AUREON newsletter subscription. You may withdraw consent at any time."
    : "This confirmation link expires in 24 hours. If you did not request this subscription, ignore this message.";
  return {
    to: job.recipient,
    subject: job.subject,
    text: `${job.text}\n\n${action}: ${url}\n\n${footer}`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(job.subject)}</title></head><body style="margin:0;padding:40px 20px;background:#0a0a0c;color:#eeeae0;font-family:Arial,sans-serif"><main style="max-width:560px;margin:auto"><p style="color:#c9a24b;letter-spacing:4px">AUREON</p><h1 style="font-family:Georgia,serif;font-weight:400">${escapeHtml(job.subject)}</h1><p style="line-height:1.8;white-space:pre-line">${escapeHtml(job.text)}</p><p><a style="color:#dec180" href="${escapeHtml(url)}">${escapeHtml(action)}</a></p><p style="font-size:12px;color:#a19b8e;line-height:1.6">${escapeHtml(footer)}</p></main></body></html>`,
  };
}
async function stillEligible(job: EmailOutbox) {
  const current = await prisma.emailOutbox.findUnique({
    where: { id: job.id },
    select: { cancelledAt: true, sentAt: true },
  });
  if (!current || current.cancelledAt || current.sentAt) return false;
  if (job.category === "OPERATIONS") {
    const admin = await prisma.user.findUnique({ where: { email: job.recipient }, select: { role: true, suspended: true, emailVerifiedAt: true } });
    return Boolean(admin?.role === "ADMIN" && !admin.suspended && admin.emailVerifiedAt);
  }
  if (job.category === "ACTIVITY") return true;
  if (!job.newsletterSubscriberId) return false;
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { id: job.newsletterSubscriberId },
  });
  if (
    !subscriber ||
    subscriber.email !== job.recipient ||
    subscriber.unsubscribedAt
  )
    return false;
  if (job.category === "NEWSLETTER_CONFIRMATION") {
    const link = newsletterActionUrl(job.actionUrl, job.category);
    return (
      !subscriber.confirmedAt &&
      Boolean(subscriber.consentAt) &&
      Boolean(
        subscriber.confirmExpiresAt && subscriber.confirmExpiresAt > new Date(),
      ) &&
      subscriber.confirmTokenHash === tokenHash(link.searchParams.get("token")!)
    );
  }
  if (
    job.category !== "CAMPAIGN" ||
    !subscriber.confirmedAt ||
    !job.campaignRecipientId
  )
    return false;
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: job.campaignRecipientId },
    include: { campaign: { select: { status: true } } },
  });
  return Boolean(
    recipient &&
      recipient.subscriberId === subscriber.id &&
      recipient.campaign.status !== "ARCHIVED",
  );
}
let processing = false;
export async function deliverNotificationEmails() {
  if (!emailConfigured || processing) return;
  processing = true;
  try {
    // Lease work atomically across workers. Retry abandoned leases after five minutes.
    const jobs = await prisma.$queryRaw<EmailOutbox[]>`
      UPDATE "EmailOutbox" SET "lockedAt"=CURRENT_TIMESTAMP,"attempts"="attempts"+1
      WHERE id IN (
        SELECT id FROM "EmailOutbox" WHERE "sentAt" IS NULL AND "cancelledAt" IS NULL AND "attempts"<10
        AND "nextAttemptAt"<=CURRENT_TIMESTAMP AND ("lockedAt" IS NULL OR "lockedAt"<CURRENT_TIMESTAMP-INTERVAL '5 minutes')
        ORDER BY CASE "category" WHEN 'OPERATIONS' THEN 0 WHEN 'ACTIVITY' THEN 1 ELSE 2 END, "createdAt" LIMIT 10 FOR UPDATE SKIP LOCKED
      ) RETURNING *`;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          // Consent and campaign status are checked immediately before provider handoff.
          if (!(await stillEligible(job))) {
            await prisma.emailOutbox.update({
              where: { id: job.id },
              data: {
                cancelledAt: new Date(),
                lockedAt: null,
                lastError:
                  "Cancelled because consent or campaign eligibility changed.",
              },
            });
            return;
          }
          await sendEmail(queuedEmailMessage(job));
          await prisma.emailOutbox.update({
            where: { id: job.id },
            data: { sentAt: new Date(), lockedAt: null, lastError: null },
          });
        } catch {
          await prisma.emailOutbox.update({
            where: { id: job.id },
            data: {
              lockedAt: null,
              lastError:
                "Email delivery failed; check provider configuration and delivery status.",
              nextAttemptAt: new Date(
                Date.now() + Math.min(86400000, 60000 * 2 ** job.attempts),
              ),
            },
          });
        }
      }),
    );
  } finally {
    processing = false;
  }
}
export function startNotificationWorker() {
  const run = () => {
    void deliverNotificationEmails().catch(() =>
      console.error(
        "Activity email worker could not access the delivery queue.",
      ),
    );
  };
  run();
  const timer = setInterval(run, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
