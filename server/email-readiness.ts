import { config } from "./config";
import { externalFetch } from "./network";

type EmailDeliveryStatus =
  | "not_configured" | "not_checked" | "checking" | "checks_passed"
  | "ip_blocked" | "credentials_rejected" | "permission_denied"
  | "sending_disabled" | "sender_unverified" | "provider_unavailable";

let readiness: { status: EmailDeliveryStatus; checkedAt: string | null } = {
  status: config.emailConfigured ? "not_checked" : "not_configured",
  checkedAt: null,
};

/** Cached startup checks, never a claim of message acceptance or inbox delivery. */
export function getEmailReadiness() {
  return { ...readiness };
}

function rejectionStatus(status: number, body: unknown): EmailDeliveryStatus {
  const message = body && typeof body === "object" && "message" in body &&
    typeof body.message === "string" ? body.message : "";
  if (/IP address|unrecogni[sz]ed IP|whitelist|allowlist/i.test(message))
    return "ip_blocked";
  if (status === 401) return "credentials_rejected";
  if (/activat|suspend|disabled/i.test(message)) return "sending_disabled";
  if (status === 403) return "permission_denied";
  return "provider_unavailable";
}

/** Read-only provider calls execute on the deployment's actual outbound network. */
export async function checkEmailReadiness() {
  if (!config.emailConfigured || config.emailProvider !== "brevo")
    return getEmailReadiness();
  readiness = { status: "checking", checkedAt: null };
  const finish = (status: EmailDeliveryStatus) => {
    readiness = { status, checkedAt: new Date().toISOString() };
    return getEmailReadiness();
  };
  try {
    for (const path of ["account", "senders"] as const) {
      const response = await externalFetch(`https://api.brevo.com/v3/${path}`, {
        method: "GET",
        redirect: "error",
        headers: { "api-key": config.brevoApiKey!, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      const body: unknown = await response.json();
      if (!response.ok) return finish(rejectionStatus(response.status, body));
      if (!body || typeof body !== "object") return finish("provider_unavailable");
      if (path === "account") {
        const relay = "relay" in body ? body.relay : undefined;
        if (!relay || typeof relay !== "object" || !("enabled" in relay) ||
          typeof relay.enabled !== "boolean") return finish("provider_unavailable");
        if (!relay.enabled) return finish("sending_disabled");
      } else {
        const senders = "senders" in body ? body.senders : undefined;
        if (!Array.isArray(senders)) return finish("provider_unavailable");
        const sender = senders.find((item: unknown) =>
          item && typeof item === "object" && "email" in item &&
          typeof item.email === "string" &&
          item.email.toLowerCase() === config.brevoSenderEmail.toLowerCase(),
        );
        if (!sender || sender.active !== true) return finish("sender_unverified");
      }
    }
    return finish("checks_passed");
  } catch {
    return finish("provider_unavailable");
  }
}
