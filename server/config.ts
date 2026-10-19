import "dotenv/config";
import { z } from "zod";
import { SUPPORT_EMAIL } from "../lib/contact";

const environment = process.env;
const nodeEnv = environment.NODE_ENV ?? "development";

function requiredSecret(name: string, minimumLength: number): string {
  const value = environment[name];
  if (!value || value.length < minimumLength) {
    throw new Error(
      `${name} must be configured with at least ${minimumLength} characters.`,
    );
  }
  return value;
}

function boolean(name: string, fallback = false): boolean {
  const value = environment[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error(`${name} must be true or false.`);
}

function port(name: string, fallback: number): number {
  const value = Number(environment[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return value;
}

const encodedKey = requiredSecret("KYC_ENCRYPTION_KEY", 32);
const encryptionKey = /^[a-fA-F0-9]{64}$/.test(encodedKey)
  ? Buffer.from(encodedKey, "hex")
  : Buffer.from(encodedKey, "base64");
if (encryptionKey.length !== 32) {
  throw new Error(
    "KYC_ENCRYPTION_KEY must encode 32 random bytes as hexadecimal or base64.",
  );
}

const appUrl = new URL(
  environment.APP_ORIGIN ??
    environment.RENDER_EXTERNAL_URL ??
    "http://localhost:3000",
);
if (
  !["http:", "https:"].includes(appUrl.protocol) ||
  appUrl.username ||
  appUrl.password ||
  appUrl.pathname !== "/" ||
  appUrl.search ||
  appUrl.hash
) {
  throw new Error("APP_ORIGIN must be an HTTP or HTTPS origin without a path.");
}
if (nodeEnv === "production" && appUrl.protocol !== "https:") {
  throw new Error("APP_ORIGIN must use HTTPS in production.");
}

const smtpHost = environment.SMTP_HOST?.trim() || undefined;
const emailFrom = environment.EMAIL_FROM?.trim() || undefined;
const resendApiKey = environment.RESEND_API_KEY?.trim() || undefined;
const brevoApiKey = environment.BREVO_API_KEY?.trim() || undefined;
const brevoSenderEmail = environment.BREVO_SENDER_EMAIL?.trim() || SUPPORT_EMAIL;
const smtpFrom = environment.SMTP_FROM?.trim() || emailFrom;
const smtpUser = environment.SMTP_USER || undefined;
const smtpPassword = environment.SMTP_PASSWORD || undefined;
if (Boolean(smtpUser) !== Boolean(smtpPassword)) {
  throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together.");
}
const authCookie = environment.AUTH_COOKIE ?? "aureon_session";
if (!/^[a-zA-Z0-9_-]+$/.test(authCookie))
  throw new Error("AUTH_COOKIE contains unsupported characters.");

const requestedEmailProvider = environment.EMAIL_PROVIDER?.trim() || undefined;
if (
  requestedEmailProvider &&
  !["brevo", "resend", "smtp", "none"].includes(requestedEmailProvider)
) {
  throw new Error("EMAIL_PROVIDER must be brevo, resend, smtp, or none.");
}
const availableEmailProviders = {
  brevo: Boolean(brevoApiKey),
  resend: Boolean(resendApiKey && emailFrom),
  smtp: Boolean(smtpHost && smtpFrom),
  none: true,
};
type EmailProvider = keyof typeof availableEmailProviders;
const preferredEmailProvider: EmailProvider =
  (requestedEmailProvider as EmailProvider | undefined) ??
  (brevoApiKey
    ? "brevo"
    : resendApiKey && emailFrom
      ? "resend"
      : smtpHost && smtpFrom
        ? "smtp"
        : "none");
const emailProvider: EmailProvider = availableEmailProviders[preferredEmailProvider]
  ? preferredEmailProvider
  : "none";
if (
  emailProvider === "brevo" &&
  !z.string().email().max(254).safeParse(brevoSenderEmail).success
) {
  throw new Error("BREVO_SENDER_EMAIL must be a valid email address.");
}

export const config = {
  nodeEnv,
  production: nodeEnv === "production",
  port: port(environment.API_PORT === undefined ? "PORT" : "API_PORT", 4000),
  appOrigin: appUrl.origin,
  jwtSecret: requiredSecret("JWT_SECRET", 32),
  encryptionKey,
  authCookie,
  fundingEnabled: boolean("FUNDING_ENABLED"),
  resendApiKey,
  brevoApiKey,
  brevoSenderEmail,
  emailFrom,
  emailProvider,
  smtpHost,
  smtpPort: port("SMTP_PORT", 587),
  smtpSecure: boolean("SMTP_SECURE"),
  smtpRequireTls: boolean("SMTP_REQUIRE_TLS", nodeEnv === "production"),
  smtpUser,
  smtpPassword,
  smtpFrom,
  emailConfigured: emailProvider !== "none",
} as const;

export const env = config;
