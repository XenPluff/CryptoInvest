import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv/config", () => ({}));

beforeEach(() => {
  vi.resetModules();
  for (const name of [
    "EMAIL_PROVIDER", "BREVO_API_KEY", "BREVO_SENDER_EMAIL", "RESEND_API_KEY",
    "EMAIL_FROM", "SMTP_HOST", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD",
    "AUTH_COOKIE", "FUNDING_ENABLED",
  ]) vi.stubEnv(name, undefined);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("JWT_SECRET", "test-only-secret-never-used-for-real-accounts");
  vi.stubEnv("KYC_ENCRYPTION_KEY", "00".repeat(32));
  vi.stubEnv("PORT", "4000");
  vi.stubEnv("API_PORT", "4000");
});

afterEach(() => vi.unstubAllEnvs());

describe("email provider configuration", () => {
  it("does not report an explicitly selected provider as configured without its key", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "brevo");
    vi.stubEnv("RESEND_API_KEY", "unused-stale-resend-key");
    vi.stubEnv("EMAIL_FROM", "security@example.test");
    const { config } = await import("../server/config");
    expect(config.emailProvider).toBe("none");
    expect(config.emailConfigured).toBe(false);
  });

  it("uses Brevo and the supplied Gmail sender instead of stale Resend settings", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "brevo");
    vi.stubEnv("BREVO_API_KEY", "test-only-brevo-key");
    vi.stubEnv("RESEND_API_KEY", "unused-stale-resend-key");
    vi.stubEnv("EMAIL_FROM", "not-an-email");
    const { config } = await import("../server/config");
    expect(config.emailProvider).toBe("brevo");
    expect(config.emailConfigured).toBe(true);
    expect(config.brevoSenderEmail).toBe("aurreon.support@gmail.com");
  });

  it("rejects an invalid Brevo sender without including its value in errors", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-only-brevo-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "invalid-private-value");
    await expect(import("../server/config")).rejects.toThrow(
      "BREVO_SENDER_EMAIL must be a valid email address.",
    );
  });

  it("rejects unknown provider names", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "invalid");
    await expect(import("../server/config")).rejects.toThrow(
      "EMAIL_PROVIDER must be brevo, resend, smtp, or none.",
    );
  });

  it("can explicitly disable email even when a key is present", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "none");
    vi.stubEnv("BREVO_API_KEY", "test-only-brevo-key");
    const { config } = await import("../server/config");
    expect(config.emailProvider).toBe("none");
    expect(config.emailConfigured).toBe(false);
  });

  it("preserves automatic Resend selection for existing installations", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-resend-key");
    vi.stubEnv("EMAIL_FROM", "security@example.test");
    const { config } = await import("../server/config");
    expect(config.emailProvider).toBe("resend");
  });

  it("lets local development explicitly select SMTP when cloud keys exist", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("BREVO_API_KEY", "test-only-brevo-key");
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_FROM", "local@example.test");
    const { config } = await import("../server/config");
    expect(config.emailProvider).toBe("smtp");
  });
});
