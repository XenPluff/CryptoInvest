import { test, expect } from "@playwright/test";

/** Public projections only. These checks never create accounts, ledger entries or funds. */
test.beforeEach(async ({ page }) => {
  await page.goto("/plans");
  const calculator = page.getByRole("region", {
    name: "Illustrative investment calculator",
  });
  await expect(
    calculator.getByText("Current published plan terms.", { exact: false }),
  ).toBeVisible();
});

test("calculator rejects fractional cents and out-of-range amounts without displaying proceeds", async ({
  page,
}) => {
  const calculator = page.getByRole("region", {
    name: "Illustrative investment calculator",
  });
  const amount = calculator.getByLabel("Your investment amount");
  await calculator
    .getByLabel("Investment plan", { exact: true })
    .selectOption("starter");
  for (const value of ["100.001", "-100", "2000", ""]) {
    await amount.fill(value);
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(calculator.getByRole("status")).toBeVisible();
    await expect(
      calculator.getByRole("img", {
        name: /Illustrative simple prorated growth/,
      }),
    ).toHaveCount(0);
    await expect(
      calculator.getByRole("status", { name: "Illustrative ending balance" }),
    ).toHaveCount(0);
  }
  await amount.fill("100.01");
  await expect(amount).toHaveAttribute("aria-invalid", "false");
  await expect(
    calculator.getByRole("status", { name: "Illustrative ending balance" }),
  ).toHaveText("$117.51");
});

test("keyboard horizon changes announce results and stop at the seven-day cap", async ({
  page,
}) => {
  const calculator = page.getByRole("region", {
    name: "Illustrative investment calculator",
  });
  await calculator
    .getByLabel("Investment plan", { exact: true })
    .selectOption("starter");
  await calculator.getByLabel("Your investment amount").fill("100");
  const horizon = calculator.getByRole("slider", { name: "Time horizon" });
  const balance = calculator.getByRole("status", {
    name: "Illustrative ending balance",
  });
  await horizon.focus();
  await page.keyboard.press("Home");
  await expect(horizon).toHaveValue("1");
  await expect(balance).toHaveText("$102.50");
  await expect(balance).toHaveAttribute("aria-live", "polite");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  await expect(horizon).toHaveValue("7");
  await expect(balance).toHaveText("$117.50");
  await expect(
    calculator.getByRole("img", {
      name: /Illustrative simple prorated growth/,
    }),
  ).toHaveAttribute("aria-label", /\$100\.00 to \$117\.50 over 7 days/);
});

test("shareholder horizon has a fixed365-day cap with reduced motion and mobile layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const calculator = page.getByRole("region", {
    name: "Illustrative investment calculator",
  });
  await calculator
    .getByLabel("Investment plan", { exact: true })
    .selectOption("shareholder");
  await calculator.getByLabel("Your investment amount").fill("15000");
  const horizon = calculator.getByRole("slider", { name: "Time horizon" });
  await horizon.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  await expect(horizon).toHaveValue("365");
  await expect(
    calculator.getByRole("status", { name: "Illustrative ending balance" }),
  ).toHaveText("$33,000.00");
  await page.keyboard.press("Home");
  await expect(
    calculator.getByRole("status", { name: "Illustrative ending balance" }),
  ).toHaveText("$15,049.31");
  await expect(
    calculator.getByText(/Illustrative projection only\./),
  ).toContainText("without reinvestment");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
