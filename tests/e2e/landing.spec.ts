import { test, expect } from "@playwright/test";
test("landing navigation and risk disclosure are connected", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Your wealth. A new perspective." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore opportunities" }),
  ).toHaveAttribute("href", "/plans");
  await expect(
    page.getByRole("link", { name: "Read our risk disclosure" }),
  ).toHaveAttribute("href", "/legal/risk");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Golden orbital sculpture" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "How are deposits verified?" })
    .click();
  await expect(page.locator("#faq-2")).toContainText(
    "A submitted hash alone never increases your balance.",
  );
});
test("theme preference persists and mobile navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Open menu" }).click();
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Our security" }).click();
  await expect(page).toHaveURL(/\/security$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("newsletter validates email before transmitting a subscription", async ({
  page,
}) => {
  await page.goto("/");
  let calls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/newsletter") && r.method() === "POST") calls++;
  });
  await page
    .getByLabel("Your email address", { exact: true })
    .fill("invalid-address");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Subscribe to insights" }).click();
  expect(
    await page
      .getByLabel("Your email address", { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.typeMismatch),
  ).toBe(true);
  expect(calls).toBe(0);
});

test("homepage plans recover from an outage and use only published active terms", async ({ page }) => {
  let available = false;
  const plan = { id: "published-ui-plan", name: "Starter", slug: "starter", active: true, dailyRate: .019, monthlyRate: 0, minAmount: 111, maxAmount: 222, durationDays: 11, description: "Published plan terms" };
  await page.route("**/api/plans", route => {
    expect(route.request().method()).toBe("GET");
    return available
      ? route.fulfill({ json: { plans: [plan, { ...plan, id: "inactive", slug: "elite", name: "Elite", active: false }] } })
      : route.fulfill({ status: 503, json: { error: "Unavailable during review" } });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator(".plans-section");
  await expect(section.getByRole("alert")).toContainText("Plans are temporarily unavailable.");
  await expect(section.locator(".landing-plan")).toHaveCount(0);
  available = true;
  await section.getByRole("button", { name: "Try again" }).click();
  const cards = section.locator(".landing-plan");
  await expect(cards).toHaveCount(1);
  await expect(cards.locator(".plan-rate")).toContainText("1.9");
  await expect(cards.locator(".plan-card-details")).toContainText("$111.00 – $222.00");
  await expect(cards.locator(".plan-card-details")).toContainText("11 days");
  await cards.getByRole("link", { name: "Explore Starter" }).click();
  await expect(page).toHaveURL(/\/plans#starter$/);
  await expect(page.locator("#starter")).toContainText("$111.00");
  await expect(page.locator("#starter")).toContainText("$222.00");
});
