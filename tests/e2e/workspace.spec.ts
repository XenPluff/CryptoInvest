import "dotenv/config";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = `workspace-browser-${Date.now()}@example.test`;
const password = "Workspace-browser-check-729!";
let registered = false;
let mailboxMessage: string | undefined;
const originHeaders = {
  Origin: new URL(process.env.E2E_BASE_URL || "http://localhost:3000").origin,
};
const mailpit = process.env.E2E_MAILPIT_URL || "http://127.0.0.1:8025";

async function signIn(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", {
    headers: originHeaders,
    data: { email, password },
  });
  expect(response.status(), await response.text()).toBe(200);
}

test.describe("Investor workspace", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      headers: originHeaders,
      data: { name: "Workspace Browser Review", email, password },
    });
    registered = response.ok();
    expect(response.status(), await response.text()).toBe(202);
    // Read only this test account's real SMTP message from the local capture inbox.
    let verificationUrl = "";
    await expect
      .poll(
        async () => {
          const inbox = await request.get(`${mailpit}/api/v1/messages`);
          if (!inbox.ok()) return false;
          const messages = (await inbox.json()).messages || [];
          const own = messages.find((m: any) =>
            m.To?.some((to: any) => to.Address === email),
          );
          if (!own) return false;
          mailboxMessage = own.ID;
          const message = await (
            await request.get(`${mailpit}/api/v1/message/${own.ID}`)
          ).json();
          verificationUrl =
            String(message.Text || "").match(
              /https?:\/\/[^\s<>]+\/verify-email\?token=[^\s<>]+/,
            )?.[0] || "";
          return Boolean(verificationUrl);
        },
        {
          timeout: 15000,
          message:
            "Registration verification email arrives at local SMTP capture",
        },
      )
      .toBe(true);
    const token = new URL(verificationUrl).searchParams.get("token");
    const verification = await request.post("/api/auth/verify-email", {
      headers: originHeaders,
      data: { token },
    });
    expect(verification.status(), await verification.text()).toBe(200);
  });
  test.afterAll(async ({ request }) => {
    if (registered) {
      const db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
      });
      try {
        await db.user.deleteMany({ where: { email } });
      } finally {
        await db.$disconnect();
      }
    }
    if (mailboxMessage)
      await request
        .delete(`${mailpit}/api/v1/messages`, {
          data: { IDs: [mailboxMessage] },
        })
        .catch(() => {});
  });

  test("signed-out dashboard and admin redirect to sign in", async ({
    page,
  }) => {
    await page.goto("/dashboard/investments");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Finvestments/);
    await expect(
      page.getByRole("textbox", { name: "Email address" }),
    ).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("real verified account sees accurate zero balances and current funding availability", async ({
    page,
    request,
  }) => {
    await signIn(page.request);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Your financial future, in focus." }),
    ).toBeVisible();
    await expect(
      page.getByText("Available balance", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".ws-stat-card").first().getByText("$0.00", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your next chapter starts here" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your record starts with real activity."),
    ).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await expect(page.locator("main.ws-content")).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: ".aureon/screenshots/workspace-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Deposit funds", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Submit a deposit" }),
    ).toBeVisible();
    const health = await (await page.request.get("/api/health")).json();
    const submit = page.getByRole("button", {
      name: "Submit for verification",
    });
    if (health.fundingEnabled) {
      await expect(submit).toBeEnabled();
      await expect(
        page.getByText("Funding is currently unavailable.", { exact: false }),
      ).toHaveCount(0);
    } else {
      await expect(submit).toBeDisabled();
      await expect(
        page.getByText("Funding is currently unavailable.", { exact: false }),
      ).toBeVisible();
    }
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Administrator access required" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to your dashboard" }),
    ).toBeVisible();
  });

  test("mobile navigation, empty states, statements, and security controls work", async ({
    page,
    request,
  }) => {
    await signIn(page.request);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Your financial future, in focus." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "Workspace navigation" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "My investments", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your investment story starts here" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).not.toBeVisible();
    await expect(page.locator(".ws-sidebar")).not.toBeVisible();
    await page.goto("/dashboard/transactions");
    await page.getByRole("tab", { name: "Withdrawals" }).click();
    await expect(
      page.getByRole("tab", { name: "Withdrawals" }),
    ).toHaveAttribute("aria-selected", "true");
    const pdf = await page.request.get("/api/statements");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
    await page.goto("/dashboard/account");
    await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Set up authenticator" }),
    ).toBeVisible();
    await expect(
      page.getByText("This form collects identity metadata;", { exact: false }),
    ).toBeVisible();
    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflowing).toBe(false);
    await expect(page.locator("main.ws-content")).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: ".aureon/screenshots/workspace-mobile.png",
      fullPage: true,
    });
  });
});
