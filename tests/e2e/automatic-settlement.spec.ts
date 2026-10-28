import { test, expect, type Page } from "@playwright/test";

// Verification requests and account records are browser-only fixtures. No real credits are posted.
async function setup(page: Page) {
  let role = "ADMIN", stage = "unverified", payload: any = null;
  const now = Date.parse("2030-01-10T12:00:00Z"); await page.clock.install({ time: now });
  const position = () => ({ id: "auto-ui-investment", userId: "investor-fixture", user: { name: "Investor Fixture" }, planName: "Starter", planSlug: "starter", status: "ACTIVE", principalAmount: 100, principalCents: 10000, earnedAmount: stage === "posted" ? 1.23 : 0, earnedCents: stage === "posted" ? 123 : 0, principalReturned: 0, principalReturnedCents: 0, startTimestamp: "2030-01-01T12:00:00Z", durationDays: 7, dailyRate: .025, monthlyRate: 0, settledAt: null, verifiedSettlements: stage === "unverified" ? [] : [{ id: "verified-ui-record", kind: payload?.kind ?? "PROFIT", processedAt: stage === "posted" ? "2030-01-10T12:00:15Z" : null }] });
  const automaticSettlement = { enabled: true, intervalSeconds: 15 };
  await page.route("**/api/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path.endsWith("/verify-settlement")) {
      expect(req.method()).toBe("POST"); payload = req.postDataJSON(); stage = "queued";
      return route.fulfill({ status: 202, json: { message: "Verified proceeds are queued for automatic settlement." } });
    }
    expect(req.method()).toBe("GET");
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { id: role === "ADMIN" ? "operator-fixture" : "investor-fixture", name: "Browser Fixture", role, twoFactorEnabled: true, emailVerified: true, kycStatus: "APPROVED" } } });
    if (path === "/api/notifications") return route.fulfill({ json: { notifications: [] } });
    if (path === "/api/admin/investments") return route.fulfill({ json: { automaticSettlement, investments: [position()] } });
    if (path === "/api/investments" || path === "/api/dashboard") return route.fulfill({ json: { automaticSettlement, investments: [position()], totalEarned: stage === "posted" ? 1.23 : 0, balance: stage === "posted" ? 1.23 : 0, invested: 100, referralEarnings: 0, transactions: [], summary: { realizedEarningsCents: stage === "posted" ? 123 : 0, activePrincipalCents: 10000, principalReturnedCents: 0, activePositions: 1, settledPositions: 0 } } });
    if (path === "/api/markets") return route.fulfill({ json: { assets: [] } });
    return route.fulfill({ status: 503, json: { error: "Unavailable in isolated browser verification" } });
  });
  return { payload: () => payload, posted: () => { stage = "posted"; }, investor: () => { role = "USER"; } };
}
async function fillProof(page: Page) {
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Additional verified profit (USD)").fill("1.23");
  await modal.getByLabel("External evidence reference").fill("external-verified-profit-123");
  await modal.locator('textarea[name="note"]').fill("Actual additional unpaid income independently reconciled against the external investment record.");
  await modal.getByLabel("Operator authenticator code").fill("123456");
  await modal.getByRole("checkbox").check();
}

test("verified profit is queued without principal and then reflected on both investor pages", async ({ page }) => {
  const fixture = await setup(page), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin/investments");
  await page.getByRole("button", { name: "Verify profits" }).click();
  await expect(page.getByRole("dialog").getByLabel("Credit type")).toHaveValue("PROFIT");
  await expect(page.getByLabel("Principal returned (USD)")).toHaveCount(0);
  await fillProof(page); await page.getByRole("button", { name: "Verify and queue settlement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.payload()).toMatchObject({ kind: "PROFIT", verified: true, principalReturned: 0, realizedEarnings: 1.23, code: "123456" });
  await expect(page.getByText("QUEUED", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify profits" })).toBeDisabled();
  fixture.posted(); await page.clock.runFor(15_100);
  await expect(page.getByRole("button", { name: "Verify profits" })).toBeEnabled();
  fixture.investor(); await page.goto("/dashboard/investments");
  await expect(page.getByText("Automatic settlement enabled", { exact: true })).toBeVisible();
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$1.23");
  await expect(page.locator('[data-position-earnings="auto-ui-investment"]')).toHaveText("$1.23");
  await page.goto("/dashboard"); await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$1.23");
  expect(errors).toEqual([]);
});

test("final settlement makes principal explicit and verification fits narrow mobile", async ({ page }) => {
  const fixture = await setup(page); await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/admin/investments"); await page.getByRole("button", { name: "Verify profits" }).click();
  await page.getByRole("dialog").getByLabel("Credit type").selectOption("FINAL");
  await expect(page.getByLabel("Principal returned (USD)")).toHaveValue("100");
  await fillProof(page);
  for (const width of [390, 320]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
  await page.getByRole("button", { name: "Verify and queue settlement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.payload()).toMatchObject({ kind: "FINAL", verified: true, principalReturned: 100, realizedEarnings: 1.23 });
});
