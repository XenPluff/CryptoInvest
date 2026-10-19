import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  query: vi.fn(),
  update: vi.fn(),
  subscriber: vi.fn(),
  recipient: vi.fn(),
  current: vi.fn(),
}));
vi.mock("../server/config", () => ({
  config: {
    appOrigin: "https://aureon.example",
    encryptionKey: Buffer.alloc(32),
    emailConfigured: true,
    emailProvider: "none",
  },
}));
vi.mock("../server/db", () => ({
  prisma: {
    $queryRaw: mocks.query,
    emailOutbox: { update: mocks.update, findUnique: mocks.current },
    newsletterSubscriber: { findUnique: mocks.subscriber },
    campaignRecipient: { findUnique: mocks.recipient },
  },
}));
vi.mock("../server/auth", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  requireTotp: vi.fn(),
}));
vi.mock("../server/mail", () => ({
  emailConfigured: true,
  sendEmail: mocks.send,
  actionEmail: () => "<p>Account action</p>",
}));
import {
  campaignInputSchema,
  contentInputSchema,
  subscriptionInputSchema,
} from "../server/content";
import {
  deliverNotificationEmails,
  newsletterActionUrl,
  queuedEmailMessage,
} from "../server/notifications";
const token = "a".repeat(43);
const confirmationLink = `https://aureon.example/newsletter/confirm?token=${token}`;
const unsubscribeLink = `https://aureon.example/newsletter/unsubscribe?token=${token}`;
const campaignJob = {
  id: "job-1",
  recipient: "subscriber@example.test",
  subject: "A measured update",
  text: '<script>alert("x")</script> & a plain-text update',
  category: "CAMPAIGN",
  actionUrl: unsubscribeLink,
  newsletterSubscriberId: "subscriber-1",
  campaignRecipientId: "recipient-1",
  attempts: 1,
};
const confirmed = {
  id: "subscriber-1",
  email: campaignJob.recipient,
  confirmedAt: new Date(),
  consentAt: new Date(),
  unsubscribedAt: null,
};
beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.current.mockResolvedValue({ cancelledAt: null, sentAt: null });
  mocks.update.mockResolvedValue({});
  mocks.send.mockResolvedValue(undefined);
});
describe("publication and campaign input boundaries", () => {
  it("requires explicit newsletter consent and normalizes an eligible address", () => {
    expect(
      subscriptionInputSchema.safeParse({ email: "investor@example.test" })
        .success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({
        email: "investor@example.test",
        consent: false,
      }).success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.parse({
        email: " Investor@Example.test ",
        consent: true,
      }).email,
    ).toBe("investor@example.test");
  });
  it("prevents callers from injecting published status or public author claims in a draft", () => {
    const draft = {
      kind: "ARTICLE",
      slug: "risk-in-context",
      title: "Risk in context",
      summary: "What investors should consider.",
      body: "A plain text article about investment risk.",
    };
    expect(contentInputSchema.safeParse(draft).success).toBe(true);
    expect(
      contentInputSchema.safeParse({ ...draft, status: "PUBLISHED" }).success,
    ).toBe(false);
    expect(
      contentInputSchema.safeParse({ ...draft, author: "Licensed advisor" })
        .success,
    ).toBe(false);
    expect(
      contentInputSchema.safeParse({ ...draft, slug: "../injected" }).success,
    ).toBe(false);
  });
  it("rejects email header injection and undeclared recipient lists", () => {
    const draft = {
      title: "A thoughtful campaign",
      subject: "An AUREON update",
      message: "An update for confirmed subscribers only.",
    };
    expect(campaignInputSchema.safeParse(draft).success).toBe(true);
    expect(
      campaignInputSchema.safeParse({
        ...draft,
        subject: "Update\r\nBcc: other@example.test",
      }).success,
    ).toBe(false);
    expect(
      campaignInputSchema.safeParse({
        ...draft,
        recipients: ["other@example.test"],
      }).success,
    ).toBe(false);
  });
});
describe("queued newsletter templates", () => {
  it("escapes all untrusted HTML and always includes consent withdrawal", () => {
    const rendered = queuedEmailMessage({
      ...campaignJob,
      subject: "<b>Update</b>",
    });
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("&lt;b&gt;Update&lt;/b&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("<b>Update</b>");
    expect(rendered.text).toContain(unsubscribeLink);
    expect(rendered.html).toContain("Unsubscribe from the newsletter");
    expect(rendered.text).toContain(
      "confirmed your AUREON newsletter subscription",
    );
  });
  it("rejects foreign hosts, unexpected paths, malformed tokens, and unsupported email categories", () => {
    for (const link of [
      `https://attacker.test/newsletter/unsubscribe?token=${token}`,
      `https://aureon.example/dashboard?token=${token}`,
      "javascript:alert(1)",
      "https://aureon.example/newsletter/unsubscribe?token=short",
    ])
      expect(() => newsletterActionUrl(link, "CAMPAIGN")).toThrow();
    expect(() =>
      queuedEmailMessage({ ...campaignJob, category: "ARBITRARY" }),
    ).toThrow();
    expect(
      newsletterActionUrl(confirmationLink, "NEWSLETTER_CONFIRMATION").pathname,
    ).toBe("/newsletter/confirm");
  });
});
describe("durable worker consent checks", () => {
  it("suppresses a queued campaign when the subscriber withdraws consent", async () => {
    mocks.query.mockResolvedValue([campaignJob]);
    mocks.subscriber.mockResolvedValue({
      ...confirmed,
      unsubscribedAt: new Date(),
    });
    await deliverNotificationEmails();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cancelledAt: expect.any(Date) }),
      }),
    );
  });
  it("suppresses campaigns after the administrator archives them", async () => {
    mocks.query.mockResolvedValue([campaignJob]);
    mocks.subscriber.mockResolvedValue(confirmed);
    mocks.recipient.mockResolvedValue({
      subscriberId: confirmed.id,
      campaign: { status: "ARCHIVED" },
    });
    await deliverNotificationEmails();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("suppresses stale or expired subscription confirmation links", async () => {
    mocks.query.mockResolvedValue([
      {
        ...campaignJob,
        category: "NEWSLETTER_CONFIRMATION",
        actionUrl: confirmationLink,
      },
    ]);
    mocks.subscriber.mockResolvedValue({
      ...confirmed,
      confirmedAt: null,
      confirmTokenHash: createHash("sha256").update(token).digest("hex"),
      confirmExpiresAt: new Date(Date.now() - 1),
    });
    await deliverNotificationEmails();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("hands off only eligible messages and records provider acceptance", async () => {
    mocks.query.mockResolvedValue([campaignJob]);
    mocks.subscriber.mockResolvedValue(confirmed);
    mocks.recipient.mockResolvedValue({
      subscriberId: confirmed.id,
      campaign: { status: "QUEUED" },
    });
    await deliverNotificationEmails();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: campaignJob.recipient,
        text: expect.stringContaining("Unsubscribe"),
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: campaignJob.id },
      data: { sentAt: expect.any(Date), lockedAt: null, lastError: null },
    });
  });
  it("retries rejected provider handoffs without recording acceptance", async () => {
    mocks.query.mockResolvedValue([campaignJob]);
    mocks.subscriber.mockResolvedValue(confirmed);
    mocks.recipient.mockResolvedValue({
      subscriberId: confirmed.id,
      campaign: { status: "QUEUED" },
    });
    mocks.send.mockRejectedValue(new Error("Provider error"));
    await deliverNotificationEmails();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextAttemptAt: expect.any(Date),
          lockedAt: null,
        }),
      }),
    );
    expect(
      mocks.update.mock.calls.some(([args]) => Boolean(args.data.sentAt)),
    ).toBe(false);
  });
});
