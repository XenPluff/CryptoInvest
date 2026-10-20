import { describe, expect, it, vi } from "vitest";
// Standalone monitor deliberately has no application/database dependency.
import { monitor, healthyStatus } from "../.github/scripts/check-uptime.mjs";
const healthy = { status: "ok", database: "connected", emailConfigured: true, emailDeliveryStatus: "checks_passed", fundingEnabled: false };
describe("independent uptime monitoring", () => {
  it("allows an intentional funding pause while requiring database and email readiness", () => {
    expect(healthyStatus(200, healthy)).toBe(true);
    expect(healthyStatus(503, healthy)).toBe(false);
    expect(healthyStatus(200, { ...healthy, database: "unavailable" })).toBe(false);
    expect(healthyStatus(200, { ...healthy, emailDeliveryStatus: "ip_blocked" })).toBe(false);
  });
  function requests(isHealthy: boolean, existing = false) {
    const calls: { url: string; method: string; body: any }[] = [];
    const request = vi.fn(async (url: string, options: any = {}) => {
      calls.push({ url, method: options.method || "GET", body: options.body ? JSON.parse(options.body) : null });
      if (url.endsWith("/api/health")) return Response.json(isHealthy ? healthy : { status: "degraded" }, { status: isHealthy ? 200 : 503 });
      if (url.includes("/issues?")) return Response.json(existing ? [{ number: 7, body: "<!-- aureon-independent-monitor -->" }] : []);
      return Response.json({});
    });
    return { request, calls };
  }
  it("opens one outage issue after three failures and no duplicate while it stays open", async () => {
    for (const existing of [false, true]) {
      const { request, calls } = requests(false, existing);
      expect((await monitor({ origin: "https://example.test", repository: "owner/project", token: "test", request, pause: async () => {} })).healthy).toBe(false);
      expect(calls.filter(call => call.url.endsWith("/api/health"))).toHaveLength(3);
      expect(calls.filter(call => call.method === "POST" && call.url.endsWith("/issues"))).toHaveLength(existing ? 0 : 1);
      expect(calls.filter(call => call.url.endsWith("/api/health")).every(call => call.body === null)).toBe(true);
    }
  });
  it("reports recovery and closes the existing alert", async () => {
    const { request, calls } = requests(true, true);
    expect((await monitor({ origin: "https://example.test", repository: "owner/project", token: "test", request, pause: async () => {} })).healthy).toBe(true);
    expect(calls.find(call => call.method === "PATCH")?.body.state).toBe("closed");
    expect(calls.filter(call => call.url.endsWith("/api/health"))).toHaveLength(1);
  });
});
