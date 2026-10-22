import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { Wallet, getBytes } from "ethers";

const email = `wallet-browser-${randomUUID()}@example.test`;
const password = "Wallet-browser-check-729!";
const key = authenticator.generateSecret();
const owner = Wallet.createRandom();
const origin = new URL(process.env.E2E_BASE_URL || "http://localhost:3000")
  .origin;
let db: PrismaClient;

test.describe("Browser wallet ownership connection", () => {
  test.beforeAll(async () => {
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
    const { encrypt } = await import("../../server/crypto");
    await db.user.create({
      data: {
        name: "Wallet Browser Review",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        referralCode: randomUUID(),
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorSecret: encrypt(key),
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

  test("opens wallet prompts only on click, verifies a real signature, and unlinks without another authenticator prompt", async ({
    page,
  }) => {
    await page.exposeFunction(
      "signWalletTestMessage",
      async (message: string) => owner.signMessage(getBytes(message)),
    );
    await page.addInitScript(
      ({ address }) => {
        const state = window as typeof window & {
          ethereum?: unknown;
          walletTestMethods?: string[];
          signWalletTestMessage?: (message: string) => Promise<string>;
        };
        state.walletTestMethods = [];
        state.ethereum = {
          isMetaMask: true,
          request: async ({
            method,
            params,
          }: {
            method: string;
            params?: unknown[];
          }) => {
            state.walletTestMethods!.push(method);
            if (method === "eth_requestAccounts") return [address];
            if (method === "eth_chainId") return "0x1";
            if (method === "personal_sign")
              return state.signWalletTestMessage!(String(params?.[0]));
            if (method === "wallet_revokePermissions") return null;
            throw new Error(`Unexpected wallet method: ${method}`);
          },
        };
      },
      { address: owner.address },
    );
    const login = await page.request.post("/api/auth/login", {
      headers: { Origin: origin },
      data: { email, password, code: authenticator.generate(key) },
    });
    expect(login.status(), await login.text()).toBe(200);
    await page.goto("/dashboard/account");
    const panel = page
      .locator(".ws-panel")
      .filter({
        has: page.getByRole("heading", { name: "Your connected wallets" }),
      });
    await expect(
      panel.getByRole("button", { name: "Connect MetaMask", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { walletTestMethods: string[] })
            .walletTestMethods,
      ),
    ).toEqual([]);
    await panel
      .getByRole("button", { name: "Connect MetaMask", exact: true })
      .click();
    await expect(
      panel.getByText(
        "Wallet ownership verified. Your funds remain in your wallet.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { walletTestMethods: string[] })
            .walletTestMethods,
      ),
    ).toEqual(["eth_requestAccounts", "eth_chainId", "personal_sign"]);
    const link = await db.walletLink.findUnique({
      where: { address: owner.address.toLowerCase() },
    });
    expect(link).toMatchObject({
      address: owner.address.toLowerCase(),
      chainId: 1,
      provider: "MetaMask",
    });
    await panel
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    await expect(
      panel.getByText("Wallet permission revoked.", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { walletTestMethods: string[] })
            .walletTestMethods,
      ),
    ).toContain("wallet_revokePermissions");
    await page.reload();
    await expect(
      panel.getByRole("button", { name: "Unlink from AUREON" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Unlink from AUREON" }).click();
    await panel.getByRole("button", { name: "Confirm unlink" }).click();
    await expect(
      panel.getByText("No wallets linked yet.", { exact: false }),
    ).toBeVisible();
    expect(
      await db.walletLink.findUnique({
        where: { address: owner.address.toLowerCase() },
      }),
    ).toBeNull();
  });
});
