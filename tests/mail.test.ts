import { beforeEach, describe, expect, it, vi } from "vitest";

const { settings, smtpSend } = vi.hoisted(() => ({
  settings: {
    emailConfigured: true,
    emailProvider: "resend" as "brevo" | "resend" | "smtp" | "none",
    emailFrom: "AUREON <security@example.test>",
    resendApiKey: "unit-test-provider-key",
    brevoApiKey: "unit-test-brevo-key",
    brevoSenderEmail: "support@example.test",
    smtpHost: "localhost",
    smtpPort: 1025,
    smtpSecure: false,
    smtpRequireTls: false,
    smtpUser: undefined,
    smtpPassword: undefined,
    smtpFrom: "AUREON <security@example.test>",
  },
  smtpSend: vi.fn(),
}));
vi.mock("../server/config", () => ({ config: settings }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: smtpSend }) },
}));

const message = {
  to: "recipient@example.test",
  subject: "Verify your email",
  text: "Open your verification link",
  html: "<p>Open your verification link</p>",
};

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  smtpSend.mockReset();
  settings.emailConfigured = true;
  settings.emailProvider = "resend";
});

describe("transactional email delivery", () => {
  it("sends through Brevo HTTPS with the verified sender and reply address", async () => {
    settings.emailProvider = "brevo";
    const network = vi.fn().mockResolvedValue(
      new Response('{"messageId":"<unit-test@brevo.test>"}', { status: 201 }),
    );
    vi.stubGlobal("fetch", network);
    const { sendEmail, emailProviderStatus } = await import("../server/mail");
    await sendEmail(message);
    expect(network).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({ "api-key": settings.brevoApiKey }),
      }),
    );
    expect(JSON.parse(network.mock.calls[0][1].body)).toEqual({
      sender: { name: "AUREON", email: settings.brevoSenderEmail },
      replyTo: { name: "AUREON Support", email: settings.brevoSenderEmail },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
    });
    expect(emailProviderStatus()).toMatchObject({ provider: "brevo", connectionVerified: true });
    expect(JSON.stringify(emailProviderStatus())).not.toContain(settings.brevoApiKey);
    expect(smtpSend).not.toHaveBeenCalled();
  });

  it("sends plain text through Brevo when no HTML body is supplied", async () => {
    settings.emailProvider = "brevo";
    const network = vi.fn().mockResolvedValue(
      new Response('{"messageId":"<unit-test@brevo.test>"}', { status: 201 }),
    );
    vi.stubGlobal("fetch", network);
    const { sendEmail } = await import("../server/mail");
    await sendEmail({ to: message.to, subject: message.subject, text: message.text });
    const body = JSON.parse(network.mock.calls[0][1].body);
    expect(body.textContent).toBe(message.text);
    expect(body).not.toHaveProperty("htmlContent");
  });

  it.each([
    [401, '{"message":"unit-test-brevo-key"}'],
    [429, '{"message":"Daily quota exceeded"}'],
    [500, '{"message":"Internal error"}'],
    [201, '{}'],
    [201, '{"messageId":" "}'],
    [201, 'invalid json'],
  ])("rejects unconfirmed Brevo delivery (%s, %s) without falling back or leaking details", async (status, body) => {
    settings.emailProvider = "brevo";
    const network = vi.fn().mockResolvedValue(new Response(body, { status }));
    vi.stubGlobal("fetch", network);
    const { sendEmail, emailProviderStatus } = await import("../server/mail");
    await expect(sendEmail(message)).rejects.toMatchObject({
      status: 503,
      message: "Email delivery is temporarily unavailable. Please try again later.",
    });
    expect(emailProviderStatus().connectionVerified).toBe(false);
    expect(network).toHaveBeenCalledTimes(1);
    expect(smtpSend).not.toHaveBeenCalled();
  });

  it("clears confirmed connectivity when a later Brevo request times out", async () => {
    settings.emailProvider = "brevo";
    const network = vi.fn()
      .mockResolvedValueOnce(new Response('{"messageId":"<unit-test@brevo.test>"}', { status: 201 }))
      .mockRejectedValueOnce(new DOMException("unit-test-brevo-key", "TimeoutError"));
    vi.stubGlobal("fetch", network);
    const { sendEmail, emailProviderStatus } = await import("../server/mail");
    await sendEmail(message);
    expect(emailProviderStatus().connectionVerified).toBe(true);
    await expect(sendEmail(message)).rejects.toMatchObject({ status: 503 });
    expect(emailProviderStatus().connectionVerified).toBe(false);
  });

  it("uses Resend HTTPS and records provider acceptance only after confirmed success", async () => {
    const network = vi
      .fn()
      .mockResolvedValue(
        new Response('{"id":"unit-test-message"}', { status: 200 }),
      );
    vi.stubGlobal("fetch", network);
    const { sendEmail, emailProviderStatus } = await import("../server/mail");
    expect(emailProviderStatus().connectionVerified).toBe(false);
    await sendEmail(message);
    expect(network).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.parse(network.mock.calls[0][1].body)).toMatchObject({
      ...message,
      from: settings.emailFrom,
      to: [message.to],
    });
    expect(emailProviderStatus()).toMatchObject({
      provider: "resend",
      configured: true,
      connectionVerified: true,
    });
    expect(smtpSend).not.toHaveBeenCalled();
    expect(JSON.stringify(emailProviderStatus())).not.toContain(
      settings.resendApiKey,
    );
  });

  it("returns a safe error without exposing provider bodies or credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"unit-test-provider-key"}', { status: 403 }),
        ),
    );
    const { sendEmail, emailProviderStatus } = await import("../server/mail");
    await expect(sendEmail(message)).rejects.toThrow(
      "Email delivery is temporarily unavailable.",
    );
    expect(emailProviderStatus().connectionVerified).toBe(false);
    expect(smtpSend).not.toHaveBeenCalled();
  });

  it("fails safely on a timeout and does not claim provider acceptance", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("unit-test-provider-key", "TimeoutError"),
        ),
    );
    const { sendEmail, emailProviderStatus } = await import("../server/mail");
    try {
      await sendEmail(message);
      throw new Error("Expected delivery failure");
    } catch (error) {
      expect((error as Error).message).not.toContain(settings.resendApiKey);
      expect((error as Error).message).toMatch(/temporarily unavailable/);
    }
    expect(emailProviderStatus().connectionVerified).toBe(false);
  });

  it("uses the explicitly configured local SMTP fallback without calling Resend", async () => {
    settings.emailProvider = "smtp";
    smtpSend.mockResolvedValue({ accepted: [message.to] });
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { sendEmail } = await import("../server/mail");
    await sendEmail(message);
    expect(smtpSend).toHaveBeenCalledWith({
      ...message,
      from: settings.smtpFrom,
    });
    expect(network).not.toHaveBeenCalled();
  });

  it("does not send when no provider is configured", async () => {
    settings.emailConfigured = false;
    settings.emailProvider = "none";
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { sendEmail } = await import("../server/mail");
    await expect(sendEmail(message)).rejects.toMatchObject({ status: 503 });
    expect(network).not.toHaveBeenCalled();
    expect(smtpSend).not.toHaveBeenCalled();
  });

  it("escapes dynamic content and uses the AUREON champagne and obsidian palette", async () => {
    const { actionEmail } = await import("../server/mail");
    const html = actionEmail({
      title: "Confirm <account>",
      description: "Secure & private",
      button: "Verify",
      url: "https://example.test/verify-email?token=abc&source=email",
      expiry: "24 hours",
      unsolicited: "Ignore if unrequested.",
    });
    expect(html).toContain("Confirm &lt;account&gt;");
    expect(html).toContain("Secure &amp; private");
    expect(html).toContain("token=abc&amp;source=email");
    expect(html).toContain("#0a0a0c");
    expect(html).toContain("#c9a24b");
    expect(html).not.toContain("<account>");
  });
});
