import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";

const email = `passkey-browser-${randomUUID()}@example.test`;
const password = "Passkey-browser-check-729!";
const secret = authenticator.generateSecret();
const origin = new URL(process.env.E2E_BASE_URL || "http://localhost:3000")
  .origin;
let db: PrismaClient;

test.describe("Browser passkey enrollment and login", () => {
  test.beforeAll(async () => {
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
    const { encrypt } = await import("../../server/crypto");
    await db.user.create({
      data: {
        name: "Passkey Browser Review",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        referralCode: randomUUID(),
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorSecret: encrypt(secret),
      },
    });
  });
  test.afterAll(async () => {
    if (db) {
      try {
        await db.user.deleteMany({ where: { email } });
      } finally {
        await db.$disconnect();
      }
    }
  });

  test("creates and verifies a real browser credential, keeps TOTP required, and removes the key", async ({
    page,
    context,
  }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    const { authenticatorId } = await cdp.send(
      "WebAuthn.addVirtualAuthenticator",
      {
        options: {
          protocol: "ctap2",
          transport: "internal",
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      },
    );
    try {
      const login = await page.request.post("/api/auth/login", {
        headers: { Origin: origin },
        data: { email, password, code: authenticator.generate(secret) },
      });
      expect(login.status(), await login.text()).toBe(200);
      await page.goto("/dashboard/account");
      const panel = page
        .locator(".ws-panel")
        .filter({
          has: page.getByRole("heading", { name: "Passkeys & biometrics" }),
        });
      await panel.getByLabel("Passkey name").fill("Browser test passkey");
      await panel
        .getByLabel("Current authenticator code")
        .fill(authenticator.generate(secret));
      await panel
        .getByRole("button", { name: "Add a passkey", exact: true })
        .click();
      await expect(
        panel.getByText(
          "Passkey added. You can use it the next time you sign in.",
        ),
      ).toBeVisible();
      await expect(
        panel.getByText("Browser test passkey", { exact: true }),
      ).toBeVisible();
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      const keys = await db.passkeyCredential.findMany({
        where: { userId: user.id },
      });
      expect(keys).toHaveLength(1);
      expect(keys[0].lastUsedAt).toBeNull();
      expect(
        (await cdp.send("WebAuthn.getCredentials", { authenticatorId }))
          .credentials,
      ).toHaveLength(1);

      await page.request.post("/api/auth/logout", {
        headers: { Origin: origin },
        data: {},
      });
      await page.goto("/login");
      const passkeyForm = page.locator(".auth-passkey");
      await passkeyForm.locator("summary").click();
      await passkeyForm.getByLabel("Email address").fill(email);
      await passkeyForm
        .getByRole("button", { name: "Continue with passkey" })
        .click();
      await expect(passkeyForm.getByRole("alert")).toContainText(
        "include your authenticator code",
      );
      await expect(page).toHaveURL(/\/login/);
      await passkeyForm
        .getByLabel("Authenticator code")
        .fill(authenticator.generate(secret));
      await passkeyForm
        .getByRole("button", { name: "Continue with passkey" })
        .click();
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(
        (
          await db.passkeyCredential.findUniqueOrThrow({
            where: { id: keys[0].id },
          })
        ).lastUsedAt,
      ).not.toBeNull();
      expect(
        await db.auditLog.count({
          where: { actorId: user.id, action: "AUTH_PASSKEY_LOGIN" },
        }),
      ).toBe(1);

      await page.goto("/dashboard/account");
      await panel
        .getByLabel("Current authenticator code")
        .fill(authenticator.generate(secret));
      await panel
        .getByRole("button", { name: "Remove Browser test passkey" })
        .click();
      await expect(
        panel.getByText("Passkey removed.", { exact: true }),
      ).toBeVisible();
      await expect(
        panel.getByText("No passkeys added yet.", { exact: true }),
      ).toBeVisible();
      expect(
        await db.passkeyCredential.count({ where: { userId: user.id } }),
      ).toBe(0);
    } finally {
      await cdp.send("WebAuthn.removeVirtualAuthenticator", {
        authenticatorId,
      });
      await cdp.detach();
    }
  });
});
