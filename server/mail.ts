import { externalFetch } from "./network";
import nodemailer from "nodemailer";
import { config } from "./config";
import { HttpError } from "./errors";

export const emailConfigured = config.emailConfigured;
const transport =
  config.emailProvider === "smtp"
    ? nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        secure: config.smtpSecure,
        requireTLS: config.smtpRequireTls,
        auth:
          config.smtpUser && config.smtpPassword
            ? { user: config.smtpUser, pass: config.smtpPassword }
            : undefined,
        tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
    : null;

let lastAcceptedAt: string | null = null;
let lastAttemptSucceeded = false;

/** Provider acceptance confirms connectivity, not delivery to an inbox. */
export function emailProviderStatus() {
  const recentlyAccepted =
    lastAcceptedAt && Date.now() - Date.parse(lastAcceptedAt) < 5 * 60 * 1000;
  return {
    provider: config.emailProvider,
    configured: emailConfigured,
    connectionVerified: Boolean(recentlyAccepted && lastAttemptSucceeded),
    lastAcceptedAt,
  };
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!emailConfigured)
    throw new HttpError(
      503,
      "Email delivery is not configured. Please contact support.",
    );
  try {
    if (config.emailProvider === "brevo") {
      const response = await externalFetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        redirect: "error",
        headers: {
          "api-key": config.brevoApiKey!,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: "AUREON", email: config.brevoSenderEmail },
          replyTo: { name: "AUREON Support", email: config.brevoSenderEmail },
          to: [{ email: message.to }],
          subject: message.subject,
          ...(message.html
            ? { htmlContent: message.html }
            : { textContent: message.text }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Provider rejected email.");
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== "object" ||
        !("messageId" in result) ||
        typeof result.messageId !== "string" ||
        !result.messageId.trim()
      )
        throw new Error("Provider acceptance was not confirmed.");
    } else if (config.emailProvider === "resend") {
      const response = await externalFetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...message,
          from: config.emailFrom,
          to: [message.to],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Provider rejected email.");
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== "object" ||
        !("id" in result) ||
        typeof result.id !== "string" ||
        !result.id
      )
        throw new Error("Provider acceptance was not confirmed.");
    } else if (transport && config.smtpFrom) {
      const result = await transport.sendMail({
        ...message,
        from: config.smtpFrom,
      });
      if (!result.accepted?.length)
        throw new Error("Provider acceptance was not confirmed.");
    } else {
      throw new Error("Provider unavailable.");
    }
    lastAcceptedAt = new Date().toISOString();
    lastAttemptSucceeded = true;
  } catch {
    lastAttemptSucceeded = false;
    throw new HttpError(
      503,
      "Email delivery is temporarily unavailable. Please try again later.",
    );
  }
}

export const sendMail = sendEmail;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export function actionEmail(input: {
  title: string;
  description: string;
  button: string;
  url: string;
  expiry: string;
  unsolicited: string;
}): string {
  const title = escapeHtml(input.title);
  const url = escapeHtml(input.url);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#0a0a0c;color:#eeeae0;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.description)}</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:48px 20px;background:#0a0a0c"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px"><tr><td style="padding:0 0 30px;font-size:23px;letter-spacing:5px;font-weight:700;color:#f5f1e8">AUREON<span style="color:#c9a24b">.</span></td></tr><tr><td style="padding:40px 34px;background:#131315;border:1px solid #343026;border-radius:16px"><p style="margin:0 0 18px;font-size:11px;font-weight:700;letter-spacing:2px;color:#c9a24b">ACCOUNT SECURITY</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.25;color:#f5f1e8">${title}</h1><p style="margin:0 0 30px;font-size:15px;line-height:1.8;color:#c4bfb4">${escapeHtml(input.description)}</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#c9a24b;border-radius:8px"><a href="${url}" style="display:inline-block;padding:16px 25px;font-weight:700;font-size:14px;text-decoration:none;color:#0a0a0c">${escapeHtml(input.button)} &rarr;</a></td></tr></table><p style="margin:28px 0 0;font-size:13px;line-height:1.8;color:#a19b8e">${escapeHtml(input.expiry)}<br>${escapeHtml(input.unsolicited)}</p><p style="margin:25px 0 0;padding-top:24px;border-top:1px solid #343026;font-size:12px;line-height:1.8;color:#a19b8e">If the button does not work, open this link:<br><a href="${url}" style="color:#dec180;overflow-wrap:anywhere;word-break:break-all">${url}</a></p></td></tr><tr><td style="padding:25px 4px;font-size:11px;line-height:1.8;color:#8d887d">AUREON &middot; Account security<br>This is an automated message. Never share your password or authentication codes.</td></tr></table></td></tr></table></body></html>`;
}
