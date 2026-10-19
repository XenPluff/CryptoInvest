import { expect, test, type Page } from "@playwright/test";

const start = "2030-01-01T12:00:00.000Z";
const startMs = Date.parse(start);
const dayMs = 86_400_000;

// UI clock fixtures only. These responses exist solely inside this browser test:
// no accounts, investments, ledger entries, settlements, or funds are created.
async function loadClockFixture(page: Page, shareholder = false) {
  await page.clock.install({ time: startMs - 60_000 });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "ui-clock-user",
          name: "UI Clock Fixture",
          role: "INVESTOR",
        },
      },
    }),
  );
  await page.route("**/api/notifications", (route) =>
    route.fulfill({ json: { notifications: [] } }),
  );
  await page.route("**/api/investments", (route) =>
    route.fulfill({
      json: {
        investments: [
          {
            id: "ui-clock-investment",
            planName: shareholder ? "Shareholder" : "Starter",
            planSlug: shareholder ? "shareholder" : "starter",
            principalAmount: shareholder ? 1_000_000 : 100,
            startTimestamp: start,
            dailyRate: shareholder ? 0 : 0.025,
            monthlyRate: shareholder ? 0.1 : 0,
            durationDays: shareholder ? 365 : 7,
            earnedAmount: 0,
            status: "ACTIVE",
          },
        ],
      },
    }),
  );
  await page.goto("/dashboard/investments");
  await expect(page.getByLabel("Illustrative investment balance")).toBeVisible();
  await page.clock.pauseAt(startMs);
}

test("UI clock fixture: minimum Starter balance visibly ticks each second and freezes at its seven-day cap", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET")
      mutations.push(`${request.method()} ${request.url()}`);
  });
  await loadClockFixture(page);
  const balance = page.getByLabel("Illustrative investment balance");
  const earnings = page.getByLabel("Illustrative accumulating earnings");
  await expect(balance).toHaveText("$100.000000USD");
  await expect(balance).toHaveAttribute("aria-live", "off");
  await expect(earnings).toHaveAttribute("aria-live", "off");
  await page.clock.runFor(1000);
  await expect(balance).toHaveText("$100.000028USD");
  await expect(earnings).toHaveText("+$0.000028");
  await page.clock.runFor(1000);
  await expect(balance).toHaveText("$100.000057USD");
  await expect(earnings).toHaveText("+$0.000057");
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Extra decimal places are not settled money/),
  ).toBeVisible();
  await page.clock.fastForward(7 * dayMs - 2000);
  await expect(balance).toHaveText("$117.500000USD");
  await expect(earnings).toHaveText("+$17.500000");
  await expect(page.getByText("Target complete", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await page.clock.fastForward(dayMs);
  await expect(balance).toHaveText("$117.500000USD");
  await expect(earnings).toHaveText("+$17.500000");
  expect(mutations).toEqual([]);
});

test("UI clock fixture: six-decimal million-dollar shareholder target fits mobile and respects the annual cap", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadClockFixture(page, true);
  const balance = page.getByLabel("Illustrative investment balance");
  await expect(balance).toHaveText("$1,000,000.000000USD");
  // An absolute jump avoids Playwright's signed 32-bit fastForward tick limit.
  await page.clock.pauseAt(startMs + 365 * dayMs);
  await expect(balance).toHaveText("$2,200,000.000000USD");
  await expect(page.getByLabel("Illustrative accumulating earnings")).toHaveText(
    "+$1,200,000.000000",
  );
  await page.clock.fastForward(dayMs);
  await expect(balance).toHaveText("$2,200,000.000000USD");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const amount = balance.locator("span").first();
    expect(
      await amount.evaluate((element) => {
        const amountRect = element.getBoundingClientRect();
        const balanceRect = element.parentElement!.getBoundingClientRect();
        return (
          amountRect.left >= balanceRect.left &&
          amountRect.right <= balanceRect.right
        );
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
