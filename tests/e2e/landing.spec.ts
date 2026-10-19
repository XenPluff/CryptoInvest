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
