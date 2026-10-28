import { test, expect, type Page } from "@playwright/test";

// Account responses exist only in this browser. No production accounts or money are created.
async function portfolioFixture(page: Page) {
  let extra = 0, failure = false, failureStatus = 503, empty = false, reads = 0;
  const now = Date.parse("2030-01-02T12:00:00Z");
  await page.clock.install({ time: now });
  const user = { id: "portfolio-ui-only", name: "Portfolio Review", role: "USER", emailVerified: true, kycStatus: "APPROVED" };
  const position = (id: string, status: string, earnedCents: number) => ({ id, status, planName: id === "active" ? "Starter" : "Elite", planSlug: "starter", principalCents: 10000, principalAmount: 100, earnedCents, earnedAmount: earnedCents / 100, principalReturnedCents: status === "SETTLED" ? 10000 : 0, principalReturned: status === "SETTLED" ? 100 : 0, startTimestamp: status === "ACTIVE" ? "2030-01-01T12:00:00Z" : "2029-12-01T12:00:00Z", settledAt: status === "SETTLED" ? "2029-12-09T12:00:00Z" : null, durationDays: 7, dailyRate: .025, monthlyRate: 0 });
  await page.route("**/api/**", route => {
    const request = route.request();
    expect(request.method()).toBe("GET");
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user } });
    if (path === "/api/notifications") return route.fulfill({ json: { notifications: [] } });
    if (path === "/api/markets") return route.fulfill({ json: { assets: [] } });
    if (["/api/dashboard", "/api/investments"].includes(path)) {
      reads++;
      if (failure) return route.fulfill({ status: failureStatus, json: { error: "Temporary read failure" } });
      return route.fulfill({ json: { generatedAt: new Date().toISOString(), investments: empty ? [] : [position("active", "ACTIVE", 0), position("settled-a", "SETTLED", 250 + extra), position("settled-b", "SETTLED", 29)], summary: { activePrincipalCents: empty ? 0 : 10000, realizedEarningsCents: empty ? 0 : 279 + extra, principalReturnedCents: empty ? 0 : 20000, activePositions: empty ? 0 : 1, settledPositions: empty ? 0 : 2 }, totalEarned: empty ? 0 : (279 + extra) / 100, balance: 202.79, invested: empty ? 0 : 100, referralEarnings: 0, transactions: [], notifications: [], user } });
    }
    return route.fulfill({ status: 503, json: { error: "Unavailable in this isolated UI test" } });
  });
  return { add: () => { extra += 100; }, fail: (value: boolean, status = 503) => { failure = value; failureStatus = status; }, empty: () => { empty = true; }, reads: () => reads };
}

test("posted earnings refresh and agree across investments and overview without replacing filters", async ({ page }) => {
  const fixture = await portfolioFixture(page);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard/investments");
  const total = page.locator('[data-portfolio-stat="realized-earnings"]');
  await expect(total).toHaveText("$2.79");
  await expect(page.locator('[data-position-earnings="settled-a"]')).toHaveText("$2.50");
  await expect(page.getByLabel("Illustrative investment balance")).toHaveCount(1);
  await page.getByRole("button", { name: "Settled 2", exact: true }).click();
  await expect(page.getByLabel("Illustrative investment balance")).toHaveCount(0);
  fixture.add();
  await page.clock.runFor(15_100);
  await expect(total).toHaveText("$3.79");
  await expect(page.getByRole("button", { name: "Settled 2", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-position-earnings="settled-a"]')).toHaveText("$3.50");
  await page.goto("/dashboard");
  await expect(total).toHaveText("$3.79");
  fixture.add();
  await page.clock.runFor(15_100);
  await expect(total).toHaveText("$4.79");
  expect(errors).toEqual([]);
});

test("failed refresh preserves confirmed amounts and supports recovery, search and empty state", async ({ page }) => {
  const fixture = await portfolioFixture(page);
  await page.goto("/dashboard/investments");
  const total = page.locator('[data-portfolio-stat="realized-earnings"]');
  await expect(total).toHaveText("$2.79");
  fixture.fail(true);
  await page.getByRole("button", { name: "Refresh portfolio" }).click();
  await expect(page.getByText("Showing last confirmed update")).toBeVisible();
  await expect(total).toHaveText("$2.79");
  fixture.fail(false); fixture.add();
  await page.getByRole("button", { name: "Refresh portfolio" }).click();
  await expect(total).toHaveText("$3.79");
  await page.getByRole("searchbox", { name: "Search investments" }).fill("settled-b");
  await expect(page.locator('[data-position-earnings]')).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Search investments" }).fill("no such reference");
  await expect(page.getByText("No matching investments")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator('[data-position-earnings]')).toHaveCount(3);
  fixture.empty(); await page.getByRole("button", { name: "Refresh portfolio" }).click();
  await expect(page.getByText("Your investment story starts here")).toBeVisible();
  await expect(total).toHaveText("$0.00");
});

test("portfolio fits desktop and mobile in English and Arabic", async ({ page }) => {
  await portfolioFixture(page);
  await page.goto("/dashboard/investments");
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$2.79");
  for (const locale of ["en", "ar"]) {
    const select = page.locator(".language-selector select").first(); await select.selectOption(locale);
    await expect(select).toHaveAttribute("aria-busy", "false");
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (locale === "en" && [1440, 390].includes(width)) await page.screenshot({ path: `.aureon/portfolio/local-${width}.png`, fullPage: true });
    }
  }
});

test("an initial read failure can recover on automatic refresh without a client exception", async ({ page }) => {
  const fixture = await portfolioFixture(page), errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  fixture.fail(true); await page.goto("/dashboard/investments");
  await expect(page.locator('.ws-state-error[role="alert"]')).toBeVisible();
  fixture.fail(false); await page.clock.runFor(15_100);
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$2.79");
  expect(errors).toEqual([]);
});

test("automatic reads pause in a hidden tab and catch up when it becomes visible", async ({ page }) => {
  const fixture = await portfolioFixture(page);
  await page.goto("/dashboard/investments");
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$2.79");
  const before = fixture.reads();
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));");
  fixture.add(); await page.clock.runFor(15_100);
  expect(fixture.reads()).toBe(before);
  await page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));");
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$3.79");
});

test("authorization failure removes private amounts instead of retaining a stale portfolio", async ({ page }) => {
  const fixture = await portfolioFixture(page);
  await page.goto("/dashboard/investments");
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveText("$2.79");
  fixture.fail(true, 401); await page.getByRole("button", { name: "Refresh portfolio" }).click();
  await expect(page.locator('.ws-state-error[role="alert"]')).toBeVisible();
  await expect(page.locator('[data-portfolio-stat="realized-earnings"]')).toHaveCount(0);
});
