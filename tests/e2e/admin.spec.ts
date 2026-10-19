import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { encrypt } from "../../server/crypto";
const suffix = Date.now().toString(36);
const email = `operator-browser-${suffix}@example.test`;
const password = "Operator-browser-check-729!";
const secret = authenticator.generateSecret();
const slug = `browser-publication-${suffix}`;
const campaignTitle = `Browser draft ${suffix}`;
let operatorId = "";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
test.beforeAll(async () => {
  const user = await db.user.create({
    data: {
      name: "Operator browser validation",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      twoFactorEnabled: true,
      twoFactorSecret: encrypt(secret),
      referralCode: `OP${suffix.toUpperCase()}`,
    },
  });
  operatorId = user.id;
});
test.afterAll(async () => {
  await db.contentEntry.deleteMany({ where: { slug } });
  await db.emailCampaign.deleteMany({
    where: { title: campaignTitle, createdById: operatorId },
  });
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
});
test("operator can publish and archive a real article and save a campaign without sending mail", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    headers: {
      Origin: new URL(process.env.E2E_BASE_URL || "http://localhost:3000")
        .origin,
    },
    data: { email, password, code: authenticator.generate(secret) },
  });
  expect(login.status(), await login.text()).toBe(200);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Total accounts", { exact: true })).toBeVisible();
  await page.goto("/admin/settings");
  const depositPanel = page.locator(".ws-panel").filter({
    has: page.getByRole("heading", {
      name: "Deposit wallet addresses",
      exact: true,
    }),
  });
  const wallets = await db.wallet.findMany({ where: { active: true } });
  await expect(depositPanel.locator("code")).toHaveCount(wallets.length);
  expect((await depositPanel.locator("code").allTextContents()).sort()).toEqual(
    wallets.map((wallet) => wallet.address).sort(),
  );
  await page.goto("/admin");
  await page.getByRole("link", { name: "Content studio", exact: true }).click();
  await page.getByRole("button", { name: "New draft", exact: true }).click();
  await page.getByLabel(/^URL slug/).fill(slug);
  await page
    .getByLabel("Title or question", { exact: true })
    .fill("Browser validation publication");
  await page
    .getByLabel("Summary", { exact: true })
    .fill(
      "A temporary local publication for validating the publishing workflow.",
    );
  await page
    .getByLabel(/^Publication text/)
    .fill(
      "This temporary text validates that an operator can publish and archive an article. No investment or financial claim is made.",
    );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  let row = page.getByRole("row").filter({ hasText: slug });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Publish", exact: true }).click();
  await page
    .getByLabel("Authenticator code", { exact: true })
    .fill(authenticator.generate(secret));
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm publication change", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect((await page.request.get(`/api/content/${slug}`)).status()).toBe(200);
  await page.goto(`/journal/${slug}`);
  await expect(
    page.getByRole("heading", {
      name: "Browser validation publication",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/admin/content");
  row = page.getByRole("row").filter({ hasText: slug });
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByLabel(/^Publication status/).selectOption("ARCHIVED");
  await page
    .getByLabel("Authenticator code", { exact: true })
    .fill(authenticator.generate(secret));
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm publication change", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect((await page.request.get(`/api/content/${slug}`)).status()).toBe(404);
  await page
    .getByRole("link", { name: "Email campaigns", exact: true })
    .click();
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  await page
    .getByLabel("Internal campaign name", { exact: true })
    .fill(campaignTitle);
  await page
    .getByLabel("Email subject", { exact: true })
    .fill("Local draft validation");
  await page
    .getByLabel(/^Email message/)
    .fill(
      "This local campaign is a draft only and must not be sent to subscribers.",
    );
  await page
    .getByRole("button", { name: "Save campaign draft", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const campaign = await db.emailCampaign.findFirst({
    where: { title: campaignTitle },
  });
  expect(campaign?.status).toBe("DRAFT");
  expect(
    await db.campaignRecipient.count({ where: { campaignId: campaign!.id } }),
  ).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator("main.ws-content")
    .evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
  await page.screenshot({
    path: ".aureon/screenshots/admin-campaigns.png",
    fullPage: true,
  });
});
