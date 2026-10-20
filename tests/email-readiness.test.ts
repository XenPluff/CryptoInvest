import { beforeEach, describe, expect, it, vi } from "vitest";

const { settings } = vi.hoisted(() => ({ settings: {
  emailConfigured: true,
  emailProvider: "brevo",
  brevoApiKey: "test-only-private-key",
  brevoSenderEmail: "support@example.test",
} }));
vi.mock("../server/config", () => ({ config: settings }));

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  settings.emailConfigured = true;
  settings.emailProvider = "brevo";
});

describe("deployment email readiness", () => {
  it("checks account and matching active sender using GET, with no email sends or per-health-request calls", async () => {
    const network = vi.fn()
      .mockResolvedValueOnce(Response.json({ relay: { enabled: true } }))
      .mockResolvedValueOnce(Response.json({ senders: [{ email: "SUPPORT@example.test", active: true }] }));
    vi.stubGlobal("fetch", network);
    const { checkEmailReadiness, getEmailReadiness } = await import("../server/email-readiness");
    expect(getEmailReadiness().status).toBe("not_checked");
    expect((await checkEmailReadiness()).status).toBe("checks_passed");
    getEmailReadiness();
    getEmailReadiness();
    expect(network.mock.calls.map(([url]) => url)).toEqual([
      "https://api.brevo.com/v3/account", "https://api.brevo.com/v3/senders",
    ]);
    for (const [, options] of network.mock.calls) expect(options).toMatchObject({
      method: "GET", redirect: "error", signal: expect.any(AbortSignal),
    });
    expect(JSON.stringify(getEmailReadiness())).not.toContain(settings.brevoApiKey);
    expect(getEmailReadiness()).not.toHaveProperty("connectionVerified");
  });

  it.each([
    [401, { message: "Unrecognised IP address 192.0.2.1 test-only-private-key" }, "ip_blocked"],
    [401, { message: "Key not found test-only-private-key" }, "credentials_rejected"],
    [403, { message: "Permission denied" }, "permission_denied"],
    [403, { message: "Account is suspended" }, "sending_disabled"],
    [500, { message: "Internal error" }, "provider_unavailable"],
    [200, {}, "provider_unavailable"],
    [200, { relay: { enabled: false } }, "sending_disabled"],
  ])("reports a safe account-check failure for HTTP %s", async (status, body, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status })));
    const { checkEmailReadiness } = await import("../server/email-readiness");
    const result = await checkEmailReadiness();
    expect(result.status).toBe(expected);
    expect(result.checkedAt).toEqual(expect.any(String));
    expect(JSON.stringify(result)).not.toContain(settings.brevoApiKey);
    expect(JSON.stringify(result)).not.toContain("192.0.2.1");
  });

  it.each([[], [{ email: "support@example.test", active: false }], [{ email: "other@example.test", active: true }]])(
    "requires the configured sender to be active", async (...items) => {
      const senders = items.filter(item => typeof item === "object");
      vi.stubGlobal("fetch", vi.fn()
        .mockResolvedValueOnce(Response.json({ relay: { enabled: true } }))
        .mockResolvedValueOnce(Response.json({ senders })));
      const { checkEmailReadiness } = await import("../server/email-readiness");
      expect((await checkEmailReadiness()).status).toBe("sender_unverified");
    },
  );

  it("handles network timeouts without leaking errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(settings.brevoApiKey)));
    const { checkEmailReadiness } = await import("../server/email-readiness");
    expect((await checkEmailReadiness()).status).toBe("provider_unavailable");
  });

  it("does not contact any provider when sending is unconfigured", async () => {
    settings.emailConfigured = false;
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { checkEmailReadiness } = await import("../server/email-readiness");
    expect((await checkEmailReadiness()).status).toBe("not_configured");
    expect(network).not.toHaveBeenCalled();
  });

  it("does not probe a different selected provider", async () => {
    settings.emailProvider = "smtp";
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { checkEmailReadiness } = await import("../server/email-readiness");
    expect((await checkEmailReadiness()).status).toBe("not_checked");
    expect(network).not.toHaveBeenCalled();
  });
});
