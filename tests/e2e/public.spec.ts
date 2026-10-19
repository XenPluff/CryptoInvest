import { test, expect } from "@playwright/test";

const publicRoutes = [
  "/plans",
  "/insights",
  "/security",
  "/about",
  "/how-it-works",
  "/support",
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/risk",
  "/legal/aml",
];
for (const route of publicRoutes) {
  test(`public route ${route} renders with working navigation`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeAttached();
    await expect(page.locator("#main")).toBeAttached();
    await expect(page.locator("header.site-header .brand")).toHaveAttribute(
      "href",
      "/",
    );
    expect(errors).toEqual([]);
  });
}

test("calculator applies plan limits and clearly distinguishes illustrative earnings", async ({
  page,
}) => {
  await page.goto("/plans");
  const calculator = page.getByRole("region", {
    name: "Illustrative investment calculator",
  });
  await expect(
    calculator.getByText(
      /Current published plan terms\.|Reference plan rates\./,
    ),
  ).toBeVisible();
  const amount = calculator.getByLabel("Your investment amount");
  await calculator
    .getByLabel("Investment plan", { exact: true })
    .selectOption("starter");
  await amount.fill("1000");
  await expect(
    calculator.getByRole("img", {
      name: /Illustrative simple prorated growth/,
    }),
  ).toHaveAttribute("aria-label", /\$1,000\.00 to \$1,175\.00 over 7 days/);
  await amount.fill("99");
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(calculator.getByRole("status")).toHaveText(
    /Enter between \$100\.00 and \$1,999\.00/,
  );
  await calculator
    .getByLabel("Investment plan", { exact: true })
    .selectOption("shareholder");
  await expect(amount).toHaveValue("15000");
  await expect(
    calculator.getByRole("img", {
      name: /Illustrative simple prorated growth/,
    }),
  ).toHaveAttribute("aria-label", /\$15,000\.00 to \$33,000\.00 over 365 days/);
  await expect(
    calculator.getByText("Simple prorated", { exact: true }),
  ).toBeVisible();
  await expect(
    calculator.getByText(/Illustrative projection only\./),
  ).toBeVisible();
});

test("support FAQ is keyboard usable and short messages cannot submit", async ({
  page,
}) => {
  await page.goto("/support");
  const question = page.getByText("How does funding availability work?", {
    exact: true,
  });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/Administrators can enable or pause funding/),
  ).toBeVisible();
  await page.getByLabel("Your name").fill("Review User");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("review@example.com");
  await page
    .getByLabel("What can we help with?")
    .selectOption("General enquiry");
  await page.getByLabel("Your message").fill("short");
  let sent = false;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/contact") && request.method() === "POST")
      sent = true;
  });
  await page.getByRole("button", { name: "Send message" }).click();
  expect(
    await page
      .getByLabel("Your message")
      .evaluate((element: HTMLTextAreaElement) => element.validity.tooShort),
  ).toBe(true);
  expect(sent).toBe(false);
});

test("support submits a real enquiry to the running API", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  test.skip(
    !health.ok(),
    "A running API and database are needed to save a real support enquiry.",
  );
  await page.goto("/support");
  await page.getByLabel("Your name").fill("Public workflow review");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("public-workflow@example.com");
  await page
    .getByLabel("What can we help with?")
    .selectOption("General enquiry");
  await page
    .getByLabel("Your message")
    .fill(
      "Automated functional review of the support contact workflow. No financial transaction is requested.",
    );
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/contact") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send message" }).click();
  expect((await responsePromise).status()).toBe(201);
  await expect(page.getByRole("status")).toHaveText(
    /message has been saved for the support team/i,
  );
  await expect(page.getByLabel("Your name")).toHaveValue("");
});

test("registration rejects short and mismatched passwords before any account request", async ({
  page,
}) => {
  await page.goto("/register");
  let sent = false;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/auth/register") &&
      request.method() === "POST"
    )
      sent = true;
  });
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Registration Review");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("registration-review@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("different-password");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create your account" }).click();
  expect(
    await page
      .getByLabel("Password", { exact: true })
      .evaluate((element: HTMLInputElement) => element.validity.tooShort),
  ).toBe(true);
  await page
    .getByLabel("Password", { exact: true })
    .fill("twelve-plus-characters");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your passwords do not match." }),
  ).toHaveText("Your passwords do not match.");
  expect(sent).toBe(false);
});

test("password reset requires a link and does not print its query token", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await expect(
    page.getByRole("heading", { name: "A fresh link is needed." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request reset link" }),
  ).toHaveAttribute("href", "/forgot-password");
  const marker = "private-token-do-not-render";
  await page.goto(`/reset-password?token=${marker}`);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(marker);
  await expect(page.locator('input[name="token"]')).toHaveCount(0);
});

test("mobile public and authentication layouts fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/plans",
    "/support",
    "/login",
    "/register",
    "/legal/risk",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
});
