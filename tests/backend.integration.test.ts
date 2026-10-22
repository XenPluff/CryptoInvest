import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer, Server } from "node:http";
import pg from "pg";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { Wallet } from "ethers";
import "dotenv/config";

const connectionString = process.env.TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;
integration("real PostgreSQL account and ledger integration", () => {
  let server: Server,
    base: string,
    prisma: any,
    encrypt: (value: string) => string,
    normalize: (network: string, value: string) => string;
  let user: any,
    adminA: any,
    adminB: any,
    wallet: any,
    plan: any,
    deposit: any,
    reserved: any;
  const cookies: Record<string, string> = {};
  const secret = authenticator.generateSecret();
  const password = "IntegrationSecurePassword43!";
  const code = () => authenticator.generate(secret);
  async function request(
    path: string,
    {
      method = "GET",
      body,
      as = "user",
      origin = "http://localhost:3000",
    }: { method?: string; body?: unknown; as?: string; origin?: string } = {},
  ) {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(origin ? { origin } : {}),
        ...(cookies[as] ? { cookie: cookies[as] } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    return { response, data };
  }
  beforeAll(async () => {
    const url = new URL(connectionString!);
    if (!url.pathname.endsWith("_test"))
      throw new Error(
        "Integration tests require an explicitly configured database ending in _test.",
      );
    if (
      process.env.DATABASE_URL &&
      new URL(process.env.DATABASE_URL).pathname === url.pathname
    )
      throw new Error(
        "Integration tests refuse to reset a database with the configured application database name.",
      );
    process.env.DATABASE_URL = connectionString;
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    process.env.KYC_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    process.env.FUNDING_ENABLED = "true";
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.NODE_ENV = "test";
    const native = new pg.Client({ connectionString });
    await native.connect();
    try {
      const migrationRoot = new URL("../prisma/migrations/", import.meta.url);
      const migrations = (await readdir(migrationRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      const sql = await Promise.all(
        migrations.map((name) =>
          readFile(new URL(`${name}/migration.sql`, migrationRoot), "utf8"),
        ),
      );
      await native.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
      for (const migration of sql) await native.query(migration);
    } finally {
      await native.end();
    }
    const db = await import("../server/db");
    prisma = db.prisma;
    encrypt = (await import("../server/crypto")).encrypt;
    const api = await import("../server/app");
    normalize = api.normalizeTxHash;
    server = createServer(api.app);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    const passwordHash = await bcrypt.hash(password, 12);
    async function account(name: string, role = "USER") {
      return prisma.user.create({
        data: {
          name,
          email: `${name}@integration.invalid`,
          passwordHash,
          role,
          emailVerifiedAt: new Date(),
          referralCode: name.toUpperCase(),
          twoFactorEnabled: true,
          twoFactorSecret: encrypt(secret),
          kyc: {
            create: {
              encryptedPayload: encrypt("{}"),
              country: "Test",
              documentType: "passport",
              status: "APPROVED",
            },
          },
        },
      });
    }
    user = await account("investor");
    adminA = await account("admin-a", "ADMIN");
    adminB = await account("admin-b", "ADMIN");
    wallet = await prisma.wallet.create({
      data: {
        asset: "ETH",
        network: "Ethereum",
        address: "0x" + "1".repeat(40),
      },
    });
    plan = await prisma.plan.create({
      data: {
        name: "Test Plan",
        slug: "starter",
        minCents: 10000,
        maxCents: 199900,
        dailyRate: 0.025,
        monthlyRate: 0,
        durationDays: 7,
        description: "Isolated test plan",
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        userId: user.id,
        amountCents: 100000,
        kind: "TEST_FIXTURE",
        referenceId: "test-start",
      },
    });
    for (const [key, account] of Object.entries({ user, adminA, adminB })) {
      const { response } = await request("/auth/login", {
        method: "POST",
        body: { email: (account as any).email, password, code: code() },
        as: "none",
      });
      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie")!;
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      cookies[key] = cookie.split(";")[0];
    }
  }, 30000);
  afterAll(async () => {
    if (server)
      await new Promise<void>((r) => {
        server.close(() => r());
        server.closeAllConnections();
      });
    if (prisma) await prisma.$disconnect();
  }, 30000);
  test("rejects cross-origin mutations and prevents ordinary users reaching admin data", async () => {
    expect(
      (
        await request("/contact", {
          method: "POST",
          body: {},
          origin: "https://attacker.invalid",
        })
      ).response.status,
    ).toBe(403);
    expect(
      (await request("/contact", { method: "POST", body: {}, origin: "" }))
        .response.status,
    ).toBe(403);
    expect((await request("/auth/me", { as: "none" })).response.status).toBe(
      401,
    );
    expect((await request("/admin/users")).response.status).toBe(403);
  });
  test("deposit configuration uses active supplied wallet addresses under administrator authorization", async () => {
    expect(
      (await request("/admin/providers", { as: "none" })).response.status,
    ).toBe(401);
    expect((await request("/admin/providers")).response.status).toBe(403);
    const result = await request("/admin/providers", { as: "adminA" });
    expect(result.response.status).toBe(200);
    expect(result.data.deposits).toMatchObject({
      method: "provided_wallet_addresses",
      confirmation: "manual_review",
      wallets: [
        {
          id: wallet.id,
          asset: wallet.asset,
          network: wallet.network,
          address: wallet.address,
        },
      ],
    });
    expect(result.data).not.toHaveProperty("custody");
    const investor = await request("/wallets");
    expect(investor.data.wallets[0].address).toBe(wallet.address);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { active: false },
    });
    try {
      expect(
        (await request("/admin/providers", { as: "adminA" })).data.deposits
          .wallets,
      ).toEqual([]);
      expect((await request("/wallets")).data.wallets).toEqual([]);
    } finally {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { active: true },
      });
    }
  });
  test("market currency caches keep provider currencies separate and stale data bounded", async () => {
    const originalFetch = globalThis.fetch;
    const originalNow = Date.now;
    const started = originalNow();
    const requested: string[] = [];
    let unavailable = false;
    globalThis.fetch = async (input, init) => {
      if (
        typeof input === "string" &&
        input.startsWith("https://api.coingecko.com/")
      ) {
        const currency = new URL(input).searchParams.get("vs_currency")!;
        requested.push(currency);
        if (unavailable) return new Response("{}", { status: 503 });
        const price = { usd: 101, eur: 92, gbp: 79 }[
          currency as "usd" | "eur" | "gbp"
        ];
        return new Response(
          JSON.stringify([
            {
              id: "bitcoin",
              symbol: "btc",
              name: "Bitcoin",
              current_price: price,
              price_change_percentage_24h: null,
            },
          ]),
          { headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    };
    try {
      for (const [currency, price] of [
        ["USD", 101],
        ["EUR", 92],
        ["GBP", 79],
      ] as const) {
        const result = await request(`/markets?currency=${currency}`, {
          as: "none",
        });
        expect(result.response.status).toBe(200);
        expect(result.data.currency).toBe(currency);
        expect(result.data.assets[0].price).toBe(price);
        expect(result.data.assets[0].change24h).toBeNull();
      }
      await request("/markets?currency=USD", { as: "none" });
      expect(requested).toEqual(["usd", "eur", "gbp"]);
      expect(
        (await request("/markets?currency=JPY", { as: "none" })).response
          .status,
      ).toBe(400);
      unavailable = true;
      Date.now = () => started + 61000;
      const stale = await request("/markets?currency=EUR", { as: "none" });
      expect(stale.response.status).toBe(200);
      expect(stale.data).toMatchObject({ currency: "EUR", stale: true });
      expect(stale.data.assets[0].price).toBe(92);
      Date.now = () => started + 16 * 60000;
      expect(
        (await request("/markets?currency=EUR", { as: "none" })).response
          .status,
      ).toBe(503);
    } finally {
      globalThis.fetch = originalFetch;
      Date.now = originalNow;
    }
  });
  test("requires enrolled withdrawal TOTP and normalizes case-insensitive hashes", async () => {
    expect(
      (
        await request("/withdrawals", {
          method: "POST",
          body: {
            asset: "ETH", network: "Ethereum", address: "0x" + "2".repeat(40),
            amount: 300,
          },
        })
      ).response.status,
    ).toBe(403);
    expect(normalize("Bitcoin", "A".repeat(64))).toBe("a".repeat(64));
    expect(normalize("TRC20", "B".repeat(64))).toBe("b".repeat(64));
    expect(normalize("Ethereum", "C".repeat(64))).toBe("0x" + "c".repeat(64));
  });
  test("declared deposits are pending; case variants cannot create duplicate credits", async () => {
    const response = await request("/deposits", {
      method: "POST",
      body: {
        walletId: wallet.id,
        amount: 300,
        txHash: "0x" + "a".repeat(64),
        code: code(),
      },
    });
    expect(response.response.status).toBe(201);
    deposit = response.data.deposit;
    expect((await request("/dashboard")).data.balance).toBe(1000);
    expect(
      (
        await request("/deposits", {
          method: "POST",
          body: {
            walletId: wallet.id,
            amount: 300,
            txHash: "A".repeat(64),
            code: code(),
          },
        })
      ).response.status,
    ).toBe(409);
    const reviews = await Promise.all(
      [1, 2].map(() =>
        request(`/admin/deposits/${deposit.id}/review`, {
          method: "POST",
          as: "adminA",
          body: {
            action: "approve",
            confirmedAmount: 300,
            ownershipEvidence:
              "Source wallet control independently documented using off-platform evidence.",
            verificationReference: "test-proof-reference",
            note: "On-chain transfer and USD valuation independently reconciled.",
            code: code(),
          },
        }),
      ),
    );
    expect(reviews.map((r) => r.response.status).sort()).toEqual([200, 409]);
    expect((await request("/dashboard")).data.balance).toBe(1300);
    expect(
      await prisma.ledgerEntry.count({
        where: { referenceId: deposit.id, kind: "VERIFIED_DEPOSIT" },
      }),
    ).toBe(1);
  });
  test("deposit approval requires claimant evidence, reconciliation reference, and current TOTP", async () => {
    const created = await request("/deposits", {
      method: "POST",
      body: {
        walletId: wallet.id,
        amount: 20,
        txHash: "0x" + "e".repeat(64),
        code: code(),
      },
    });
    expect(created.response.status).toBe(201);
    const id = created.data.deposit.id;
    const prior = (await request("/dashboard")).data.balance;
    const approval = {
      action: "approve",
      confirmedAmount: 20,
      note: "Verified the chain transfer, confirmations, and exact USD valuation.",
      code: code(),
    };
    expect(
      (
        await request(`/admin/deposits/${id}/review`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/deposits/${id}/review`, {
          method: "POST",
          as: "adminA",
          body: {
            ...approval,
            ownershipEvidence:
              "Source wallet control independently documented.",
          },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/deposits/${id}/review`, {
          method: "POST",
          as: "adminA",
          body: { ...approval, verificationReference: "external-proof-123" },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/deposits/${id}/review`, {
          method: "POST",
          as: "adminA",
          body: {
            ...approval,
            ownershipEvidence:
              "Source wallet control independently documented.",
            verificationReference: "external-proof-123",
            code: undefined,
          },
        })
      ).response.status,
    ).toBe(403);
    expect(
      (await prisma.transaction.findUnique({ where: { id } })).status,
    ).toBe("PENDING");
    expect(await prisma.ledgerEntry.count({ where: { referenceId: id } })).toBe(
      0,
    );
    expect((await request("/dashboard")).data.balance).toBe(prior);
  });
  test("simultaneous investment and withdrawal cannot double spend the same funds", async () => {
    const results = await Promise.all([
      request("/investments", {
        method: "POST",
        body: { planId: plan.id, amount: 1000, code: code() },
      }),
      request("/withdrawals", {
        method: "POST",
        body: {
          asset: "ETH",
          network: "Ethereum",
          address: "0x" + "2".repeat(40),
          amount: 1000,
          code: code(),
        },
      }),
    ]);
    expect(results.map((r) => r.response.status).sort()).toEqual([201, 409]);
    expect((await request("/dashboard")).data.balance).toBe(300);
    reserved =
      results[1].response.status === 201 ? results[1].data.withdrawal : null;
  });
  test("withdrawal reserves refund only once and ledger history cannot be rewritten", async () => {
    if (!reserved) {
      const response = await request("/withdrawals", {
        method: "POST",
        body: {
          asset: "ETH",
          network: "Ethereum",
          address: "0x" + "2".repeat(40),
          amount: 100,
          code: code(),
        },
      });
      expect(response.response.status).toBe(201);
      reserved = response.data.withdrawal;
    }
    const prior = (await request("/dashboard")).data.balance;
    const results = await Promise.all(
      [1, 2].map(() =>
        request(`/admin/withdrawals/${reserved.id}/review`, {
          method: "POST",
          as: "adminA",
          body: {
            action: "reject",
            note: "Rejected after independent destination verification.",
            code: code(),
          },
        }),
      ),
    );
    expect(results.map((r) => r.response.status).sort()).toEqual([200, 409]);
    expect((await request("/dashboard")).data.balance).toBe(
      prior + reserved.amount,
    );
    await expect(
      prisma.ledgerEntry.updateMany({
        where: { referenceId: "test-start" },
        data: { amountCents: 99999999 },
      }),
    ).rejects.toThrow();
  });
  test("payout marking requires approval and a different administrator for reconciliation", async () => {
    const created = await request("/withdrawals", {
      method: "POST",
      body: {
        asset: "ETH",
        network: "Ethereum",
        address: "0x" + "2".repeat(40),
        amount: 10,
        code: code(),
      },
    });
    expect(created.response.status).toBe(201);
    const id = created.data.withdrawal.id;
    const body = {
      action: "paid",
      note: "External payout independently verified on chain.",
      txHash: "0x" + "d".repeat(64),
      code: code(),
    };
    expect(
      (
        await request(`/admin/withdrawals/${id}/review`, {
          method: "POST",
          as: "adminA",
          body,
        })
      ).response.status,
    ).toBe(409);
    expect(
      (
        await request(`/admin/withdrawals/${id}/review`, {
          method: "POST",
          as: "adminA",
          body: {
            action: "approve",
            note: "Approved after independent withdrawal checks.",
            code: code(),
          },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await request(`/admin/withdrawals/${id}/review`, {
          method: "POST",
          as: "adminA",
          body,
        })
      ).response.status,
    ).toBe(403);
    expect(
      (
        await request(`/admin/withdrawals/${id}/review`, {
          method: "POST",
          as: "adminB",
          body,
        })
      ).response.status,
    ).toBe(200);
  });
  test("investment settlement requires maturity, evidence, and bounded actual principal", async () => {
    const created = await request("/investments", {
      method: "POST",
      body: { planId: plan.id, amount: 100, code: code() },
    });
    expect(created.response.status).toBe(201);
    const id = created.data.investment.id;
    const prior = (await request("/dashboard")).data.balance;
    const settlement = {
      principalReturned: 65,
      realizedEarnings: 0,
      externalReference: "external-loss-reconciliation",
      note: "Actual custody proceeds independently reconciled; a principal loss was confirmed.",
      code: code(),
    };
    expect(
      (
        await request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: settlement,
        })
      ).response.status,
    ).toBe(409);
    await prisma.investment.update({
      where: { id },
      data: { startTimestamp: new Date(Date.now() - 8 * 86400000) },
    });
    expect((await request("/dashboard")).data.balance).toBe(prior);
    expect(
      (
        await request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: { ...settlement, code: undefined },
        })
      ).response.status,
    ).toBe(403);
    expect(
      (
        await request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: { ...settlement, externalReference: undefined },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: { ...settlement, note: "Too short" },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: { ...settlement, principalReturned: 100.01 },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: { ...settlement, realizedEarnings: -1 },
        })
      ).response.status,
    ).toBe(400);
    expect(
      await prisma.ledgerEntry.count({
        where: {
          referenceId: id,
          kind: { in: ["PRINCIPAL_RETURN", "REALIZED_EARNINGS"] },
        },
      }),
    ).toBe(0);
    const results = await Promise.all(
      [1, 2].map(() =>
        request(`/admin/investments/${id}/settle`, {
          method: "POST",
          as: "adminA",
          body: settlement,
        }),
      ),
    );
    expect(results.map((result) => result.response.status).sort()).toEqual([
      200, 409,
    ]);
    expect((await request("/dashboard")).data.balance).toBe(prior + 65);
    expect(
      await prisma.ledgerEntry.count({
        where: { referenceId: id, kind: "PRINCIPAL_RETURN", amountCents: 6500 },
      }),
    ).toBe(1);
    expect(
      await prisma.ledgerEntry.count({
        where: { referenceId: id, kind: "REALIZED_EARNINGS", amountCents: 0 },
      }),
    ).toBe(1);
    expect(await prisma.investment.findUnique({ where: { id } })).toMatchObject(
      { status: "SETTLED", earnedCents: 0, settledAt: expect.any(Date) },
    );
    const audit = await prisma.auditLog.findFirst({
      where: { action: "INVESTMENT_SETTLED", targetId: id },
    });
    expect(audit.metadata).toMatchObject({
      principalReturnedCents: 6500,
      realizedEarningsCents: 0,
      externalReference: settlement.externalReference,
    });
  });
  test("only reconciled settlement earnings become realized income and withdrawable funds", async () => {
    const before = (await request("/dashboard")).data;
    const created = await request("/investments", {
      method: "POST",
      body: { planId: plan.id, amount: 100, code: code() },
    });
    expect(created.response.status).toBe(201);
    const id = created.data.investment.id;
    await prisma.investment.update({
      where: { id },
      data: { startTimestamp: new Date(Date.now() - 8 * 86400000) },
    });
    const mature = (await request("/dashboard")).data;
    expect(mature.balance).toBe(before.balance - 100);
    expect(mature.totalEarned).toBe(before.totalEarned);
    const settled = await request(`/admin/investments/${id}/settle`, {
      method: "POST",
      as: "adminA",
      body: {
        principalReturned: 100,
        realizedEarnings: 2.5,
        externalReference: "custody-realized-earnings-123",
        note: "Actual principal and two dollars fifty of income independently reconciled.",
        code: code(),
      },
    });
    expect(settled.response.status).toBe(200);
    expect(settled.data.investment.earnedAmount).toBe(2.5);
    const after = (await request("/dashboard")).data;
    expect(after.balance).toBe(before.balance + 2.5);
    expect(after.totalEarned).toBe(before.totalEarned + 2.5);
  });
  test("the operator funding pause is enforced by the server", async () => {
    await prisma.setting.upsert({
      where: { key: "fundingEnabled" },
      create: { key: "fundingEnabled", value: "false" },
      update: { value: "false" },
    });
    try {
      expect(
        (
          await request("/withdrawals", {
            method: "POST",
            body: {
              asset: "ETH",
              network: "Ethereum",
              address: "0x" + "2".repeat(40),
              amount: 1,
              code: code(),
            },
          })
        ).response.status,
      ).toBe(503);
    } finally {
      await prisma.setting.update({
        where: { key: "fundingEnabled" },
        data: { value: "true" },
      });
    }
  });
  test("wallet ownership proofs bind account and session and cannot be replayed", async () => {
    const owner = Wallet.createRandom();
    const input = { address: owner.address, chainId: 1, provider: "MetaMask" };
    const challenge = await request("/wallet-connect/challenge", {
      method: "POST",
      body: input,
    });
    expect(challenge.response.status).toBe(201);
    const proof = {
      challengeId: challenge.data.challengeId,
      signature: await owner.signMessage(challenge.data.message),
    };
    expect(
      (
        await request("/wallet-connect/verify", {
          method: "POST",
          as: "adminA",
          body: proof,
        })
      ).response.status,
    ).toBe(409);
    const login = await request("/auth/login", {
      method: "POST",
      as: "none",
      body: { email: user.email, password, code: code() },
    });
    expect(login.response.status).toBe(200);
    cookies.secondSession = login.response.headers
      .get("set-cookie")!
      .split(";")[0];
    expect(
      (
        await request("/wallet-connect/verify", {
          method: "POST",
          as: "secondSession",
          body: proof,
        })
      ).response.status,
    ).toBe(409);
    const wrongOwner = Wallet.createRandom();
    expect(
      (
        await request("/wallet-connect/verify", {
          method: "POST",
          body: {
            ...proof,
            signature: await wrongOwner.signMessage(challenge.data.message),
          },
        })
      ).response.status,
    ).toBe(400);
    const verified = await request("/wallet-connect/verify", {
      method: "POST",
      body: proof,
    });
    expect(verified.response.status).toBe(200);
    expect(verified.data.link.address).toBe(owner.address.toLowerCase());
    expect(
      (await request("/wallet-connect/verify", { method: "POST", body: proof }))
        .response.status,
    ).toBe(409);
    const another = await request("/wallet-connect/challenge", {
      method: "POST",
      as: "adminA",
      body: input,
    });
    expect(another.response.status).toBe(201);
    expect(
      (
        await request("/wallet-connect/verify", {
          method: "POST",
          as: "adminA",
          body: {
            challengeId: another.data.challengeId,
            signature: await owner.signMessage(another.data.message),
          },
        })
      ).response.status,
    ).toBe(409);
    expect((await request(`/wallet-connect/links/${verified.data.link.id}`, {method: "DELETE", as: "adminA", body: {}})).response.status).toBe(404);
    expect((await request(`/wallet-connect/links/${verified.data.link.id}`, {method: "DELETE", body: {}})).response.status).toBe(200);
    expect((await request("/wallet-connect/links")).data.links).toEqual([]);
  });
  test("passkey enrollment needs reauthentication and consumes failed challenges once", async () => {
    expect(
      (
        await request("/auth/passkeys/register/options", {
          method: "POST",
          body: {},
        })
      ).response.status,
    ).toBe(403);
    const enrollment = await request("/auth/passkeys/register/options", {
      method: "POST",
      body: { password },
    });
    expect(enrollment.response.status).toBe(200);
    expect(
      enrollment.data.options.authenticatorSelection.userVerification,
    ).toBe("required");
    expect(enrollment.data.options.rp.id).toBe("localhost");
    const stored = await prisma.passkeyChallenge.findUnique({
      where: { id: enrollment.data.challengeId },
    });
    expect(stored.challengeHash).not.toBe(enrollment.data.options.challenge);
    expect(stored.sessionId).toBeTruthy();
    const malformed = {
      challengeId: enrollment.data.challengeId,
      label: "Invalid authenticator",
      response: {
        id: "dGVzdA",
        rawId: "dGVzdA",
        type: "public-key",
        response: { clientDataJSON: "e30", attestationObject: "dGVzdA" },
        clientExtensionResults: {},
      },
    };
    expect(
      (
        await request("/auth/passkeys/register/verify", {
          method: "POST",
          as: "adminA",
          body: malformed,
        })
      ).response.status,
    ).toBe(400);
    expect(
      (await prisma.passkeyChallenge.findUnique({ where: { id: stored.id } }))
        .usedAt,
    ).toBeNull();
    expect(
      (
        await request("/auth/passkeys/register/verify", {
          method: "POST",
          body: malformed,
        })
      ).response.status,
    ).toBe(400);
    expect(
      (await prisma.passkeyChallenge.findUnique({ where: { id: stored.id } }))
        .usedAt,
    ).toBeInstanceOf(Date);
    expect(
      (
        await request("/auth/passkeys/register/verify", {
          method: "POST",
          body: malformed,
        })
      ).response.status,
    ).toBe(400);
    expect(await prisma.passkeyCredential.count()).toBe(0);
  });
  test("analytics expose recorded account balances and realized earnings under authorization", async () => {
    expect((await request("/analytics", { as: "none" })).response.status).toBe(
      401,
    );
    expect((await request("/admin/analytics")).response.status).toBe(403);
    const dashboard = (await request("/dashboard")).data;
    const analytics = await request("/analytics");
    expect(analytics.response.status).toBe(200);
    expect(analytics.data.currency).toBe("USD");
    expect(analytics.data.summary.availableBalanceCents).toBe(
      Math.round(dashboard.balance * 100),
    );
    expect(analytics.data.summary.realizedEarningsCents).toBe(
      Math.round(dashboard.totalEarned * 100),
    );
    expect(analytics.data.summary.activePrincipalCents).toBe(
      Math.round(dashboard.invested * 100),
    );
    expect(analytics.data.history.at(-1).balanceCents).toBe(
      Math.round(dashboard.balance * 100),
    );
    expect(
      (await request("/admin/analytics", { as: "adminA" })).response.status,
    ).toBe(200);
  });
  test("publications stay private until a reauthenticated administrator publishes", async () => {
    const article = {
      kind: "ARTICLE",
      slug: "isolated-reconciliation-guide",
      title: "Reconciliation guide",
      summary: "Operator reconciliation guidance.",
      body: "Published content uses actual recorded information and makes no fabricated performance claims.",
    };
    expect(
      (await request("/admin/content", { method: "POST", body: article }))
        .response.status,
    ).toBe(403);
    const created = await request("/admin/content", {
      method: "POST",
      as: "adminA",
      body: { ...article, code: code() },
    });
    expect(created.response.status).toBe(201);
    const id = created.data.entry.id;
    expect(
      (await request(`/content/${article.slug}`, { as: "none" })).response
        .status,
    ).toBe(404);
    expect((await request("/content", { as: "none" })).data.entries).toEqual(
      [],
    );
    expect(
      (await request("/content?limit=1.5", { as: "none" })).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/content/${id}/status`, {
          method: "POST",
          as: "adminA",
          body: { status: "PUBLISHED" },
        })
      ).response.status,
    ).toBe(403);
    expect(
      (
        await request(`/admin/content/${id}/status`, {
          method: "POST",
          as: "adminA",
          body: { status: "PUBLISHED", code: code() },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (await request(`/content/${article.slug}`, { as: "none" })).data.entry
        .body,
    ).toBe(article.body);
    expect(
      (
        await request(`/admin/content/${id}`, {
          method: "PATCH",
          as: "adminA",
          body: { ...article, title: "Unreviewed edits", code: code() },
        })
      ).response.status,
    ).toBe(409);
  });
  test("campaigns require confirmed consent and explicit TOTP approval and respect withdrawal", async () => {
    const email = "newsletter@integration.invalid";
    expect(
      (
        await request("/newsletter", {
          method: "POST",
          as: "none",
          body: { email },
        })
      ).response.status,
    ).toBe(400);
    const subscribed = await request("/newsletter", {
      method: "POST",
      as: "none",
      body: { email, consent: true },
    });
    expect(subscribed.response.status).toBe(202);
    expect(subscribed.data.token).toBeUndefined();
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    expect(subscriber.confirmedAt).toBeNull();
    const confirmation = await prisma.emailOutbox.findFirst({
      where: {
        newsletterSubscriberId: subscriber.id,
        category: "NEWSLETTER_CONFIRMATION",
      },
    });
    const confirmToken = new URL(confirmation.actionUrl).searchParams.get(
      "token",
    );
    expect(subscriber.confirmTokenHash).not.toBe(confirmToken);
    const draft = {
      title: "Consented investor newsletter",
      subject: "Recorded platform updates",
      message:
        "This isolated newsletter contains no invented returns and uses explicit subscriber consent.",
    };
    const created = await request("/admin/campaigns", {
      method: "POST",
      as: "adminA",
      body: { ...draft, code: code() },
    });
    expect(created.response.status).toBe(201);
    const campaignId = created.data.campaign.id;
    expect(
      await prisma.campaignRecipient.count({ where: { campaignId } }),
    ).toBe(0);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: { code: code() },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: { confirmation: "QUEUE CAMPAIGN" },
        })
      ).response.status,
    ).toBe(403);
    const approval = { confirmation: "QUEUE CAMPAIGN", code: code() };
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).data.queued,
    ).toBe(0);
    expect(
      (await request("/newsletter/confirm", { as: "none" })).response.status,
    ).toBe(404);
    expect(
      (
        await prisma.newsletterSubscriber.findUnique({
          where: { id: subscriber.id },
        })
      ).confirmedAt,
    ).toBeNull();
    expect(
      (
        await request("/newsletter/confirm", {
          method: "POST",
          as: "none",
          body: { token: confirmToken },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await request("/newsletter/confirm", {
          method: "POST",
          as: "none",
          body: { token: confirmToken },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).data.queued,
    ).toBe(1);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).data.queued,
    ).toBe(0);
    const campaignMail = await prisma.emailOutbox.findFirst({
      where: { category: "CAMPAIGN", newsletterSubscriberId: subscriber.id },
    });
    expect(campaignMail.sentAt).toBeNull();
    const archived = await request("/admin/campaigns", {
      method: "POST",
      as: "adminA",
      body: { ...draft, title: "Campaign pending archive", code: code() },
    });
    expect(archived.response.status).toBe(201);
    const archivedId = archived.data.campaign.id;
    expect(
      (
        await request(`/admin/campaigns/${archivedId}/queue`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).data.queued,
    ).toBe(1);
    const archivedRecipient = await prisma.campaignRecipient.findFirst({
      where: { campaignId: archivedId },
    });
    expect(
      (
        await request(`/admin/campaigns/${archivedId}/archive`, {
          method: "POST",
          as: "adminA",
          body: { code: code() },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await prisma.emailOutbox.findUnique({
          where: { campaignRecipientId: archivedRecipient.id },
        })
      ).cancelledAt,
    ).toBeInstanceOf(Date);
    const unsubscribeToken = new URL(campaignMail.actionUrl).searchParams.get(
      "token",
    );
    expect(
      (
        await request("/newsletter/unsubscribe", {
          method: "POST",
          as: "none",
          body: { token: unsubscribeToken },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await request("/newsletter/unsubscribe", {
          method: "POST",
          as: "none",
          body: { token: unsubscribeToken },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (await prisma.emailOutbox.findUnique({ where: { id: campaignMail.id } }))
        .cancelledAt,
    ).toBeInstanceOf(Date);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).data.queued,
    ).toBe(0);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/archive`, {
          method: "POST",
          as: "adminA",
          body: { code: code() },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await request(`/admin/campaigns/${campaignId}/queue`, {
          method: "POST",
          as: "adminA",
          body: approval,
        })
      ).response.status,
    ).toBe(409);
  });
  test("identity form encrypts sensitive fields and requires a reviewed submission", async () => {
    const pending = await prisma.user.create({
      data: {
        name: "Identity Applicant",
        email: "identity@integration.invalid",
        passwordHash: await bcrypt.hash(password, 12),
        emailVerifiedAt: new Date(),
        referralCode: "IDENTITY",
      },
    });
    const login = await request("/auth/login", {
      method: "POST",
      as: "none",
      body: { email: pending.email, password },
    });
    cookies.identity = login.response.headers.get("set-cookie")!.split(";")[0];
    const setup = await request("/auth/2fa/setup", {
      method: "POST",
      as: "identity",
      body: {},
    });
    expect(setup.response.status).toBe(200);
    expect(
      (
        await request("/auth/2fa/enable", {
          method: "POST",
          as: "identity",
          body: { code: authenticator.generate(setup.data.secret) },
        })
      ).response.status,
    ).toBe(200);
    expect(
      (await request("/auth/me", { as: "identity" })).data.user
        .twoFactorEnabled,
    ).toBe(true);
    const form = {
      fullName: "Identity Applicant",
      country: "Canada",
      dateOfBirth: "1990-04-15",
      documentType: "passport",
      documentNumber: "ISOLATED-TEST-1234",
    };
    expect(
      (await request("/kyc", { method: "POST", as: "identity", body: form }))
        .response.status,
    ).toBe(201);
    const kyc = await prisma.kycSubmission.findUnique({
      where: { userId: pending.id },
    });
    expect(kyc.encryptedPayload).not.toContain(form.documentNumber);
    expect(kyc.encryptedPayload).not.toContain(form.fullName);
    expect(
      (await request("/kyc", { method: "POST", as: "identity", body: form }))
        .response.status,
    ).toBe(409);
    expect(
      (
        await request(`/admin/kyc/${kyc.id}/review`, {
          method: "POST",
          as: "adminA",
          body: {
            action: "approve",
            note: "Independent test identity evidence reviewed.",
            code: code(),
          },
        })
      ).response.status,
    ).toBe(200);
    expect((await request("/kyc", { as: "identity" })).data.kyc.status).toBe(
      "APPROVED",
    );
    await prisma.user.update({
      where: { id: pending.id },
      data: { role: "ADMIN", twoFactorEnabled: false },
    });
    expect(
      (await request("/admin/kyc", { as: "identity" })).response.status,
    ).toBe(401);
  });
  test("money events enqueue durable activity emails within the ledger transaction", async () => {
    expect(await prisma.emailOutbox.count()).toBeGreaterThan(0);
    const outbox = await prisma.emailOutbox.findFirst();
    expect(outbox.sentAt).toBeNull();
    expect(outbox.attempts).toBe(0);
    if (["127.0.0.1", "localhost"].includes(process.env.SMTP_HOST || "")) {
      const queued = await prisma.emailOutbox.count({
        where: { sentAt: null, cancelledAt: null },
      });
      const worker = await import("../server/notifications");
      await worker.deliverNotificationEmails();
      expect(
        await prisma.emailOutbox.count({ where: { sentAt: { not: null } } }),
      ).toBe(Math.min(queued, 10));
      expect(
        await prisma.emailOutbox.count({
          where: { lastError: { not: null }, cancelledAt: null },
        }),
      ).toBe(0);
    }
  });
  async function financialAccount(label: string, cents = 0) {
    const suffix = randomUUID();
    const account = await prisma.user.create({
      data: {
        name: label,
        email: `${suffix}@integration.invalid`,
        passwordHash: user.passwordHash,
        emailVerifiedAt: new Date(),
        referralCode: suffix,
        twoFactorEnabled: true,
        twoFactorSecret: encrypt(secret),
        kyc: {
          create: {
            country: "Test",
            documentType: "passport",
            encryptedPayload: encrypt("{}"),
            status: "APPROVED",
          },
        },
      },
    });
    if (cents)
      await prisma.ledgerEntry.create({
        data: {
          userId: account.id,
          amountCents: cents,
          kind: "TEST_FIXTURE",
          referenceId: suffix,
        },
      });
    return account;
  }
  const balanceOf = async (id: string) =>
    (
      await prisma.ledgerEntry.aggregate({
        where: { userId: id },
        _sum: { amountCents: true },
      })
    )._sum.amountCents || 0;
  const transferRequest = (
    fromUserId: string,
    toUserId: string,
    amount = 40,
  ) => ({
    fromUserId,
    toUserId,
    amount,
    idempotencyKey: randomUUID(),
    note: "Documented internal account transfer request.",
    code: code(),
  });
  test("admin balance credits and debits require fresh proof, cannot overdraft, and post once with an audit reference", async () => {
    const target = await financialAccount("Balance correction");
    const body = {
      userId: target.id,
      direction: "credit",
      amount: "125.50",
      externalReference: "reconciliation-2026-001",
      idempotencyKey: randomUUID(),
      note: "Reconciled adjustment supported by independent records.",
      code: code(),
    };
    expect(
      (await request("/admin/balance-adjustments", { method: "POST", body }))
        .response.status,
    ).toBe(403);
    expect(
      (
        await request("/admin/balance-adjustments", {
          method: "POST",
          as: "adminA",
          body: { ...body, code: undefined },
        })
      ).response.status,
    ).toBe(403);
    const credit = await request("/admin/balance-adjustments", {
      method: "POST",
      as: "adminA",
      body,
    });
    expect(credit.response.status).toBe(201);
    expect(credit.data.balance).toBe(125.5);
    expect(
      (
        await request("/admin/balance-adjustments", {
          method: "POST",
          as: "adminA",
          body,
        })
      ).response.status,
    ).toBe(409);
    expect(await balanceOf(target.id)).toBe(12550);
    expect(
      (
        await request("/admin/balance-adjustments", {
          method: "POST",
          as: "adminA",
          body: {
            ...body,
            idempotencyKey: randomUUID(),
            direction: "debit",
            amount: 126,
          },
        })
      ).response.status,
    ).toBe(409);
    expect(
      (
        await request("/admin/balance-adjustments", {
          method: "POST",
          as: "adminA",
          body: {
            ...body,
            idempotencyKey: randomUUID(),
            direction: "debit",
            amount: 25.5,
          },
        })
      ).response.status,
    ).toBe(201);
    expect(await balanceOf(target.id)).toBe(10000);
    expect(
      (await request(`/admin/users/${target.id}/ledger`, { as: "adminA" })).data
        .balance,
    ).toBe(100);
    const directory = (await request("/admin/users", { as: "adminA" })).data
      .users;
    expect(directory.find((entry: any) => entry.id === target.id).balance).toBe(
      100,
    );
    const history = (
      await request("/admin/transactions?type=ADJUSTMENT&status=SETTLED", {
        as: "adminA",
      })
    ).data.transactions.filter((entry: any) => entry.userId === target.id);
    expect(history).toHaveLength(2);
    expect(history.map((entry: any) => entry.direction).sort()).toEqual([
      "CREDIT",
      "DEBIT",
    ]);
    expect(
      await prisma.auditLog.count({
        where: {
          action: "BALANCE_ADJUSTMENT",
          targetId: credit.data.transaction.id,
        },
      }),
    ).toBe(1);
    expect(
      (
        await request("/admin/balance-adjustments", {
          method: "POST",
          as: "adminA",
          body: { ...body, userId: adminA.id, idempotencyKey: randomUUID() },
        })
      ).response.status,
    ).toBe(403);
  });
  test("account transfers reserve funds and concurrent approvals credit the recipient only once", async () => {
    const sender = await financialAccount("Transfer sender", 10000),
      recipient = await financialAccount("Transfer recipient");
    const body = transferRequest(sender.id, recipient.id);
    expect(
      (await request("/admin/transfers", { method: "POST", body })).response
        .status,
    ).toBe(403);
    expect(
      (
        await request("/admin/transfers", {
          method: "POST",
          as: "adminA",
          body: { ...body, code: undefined },
        })
      ).response.status,
    ).toBe(403);
    const created = await request("/admin/transfers", {
      method: "POST",
      as: "adminA",
      body,
    });
    expect(created.response.status).toBe(201);
    expect(await balanceOf(sender.id)).toBe(6000);
    expect(await balanceOf(recipient.id)).toBe(0);
    expect(
      (
        await request("/admin/transfers", {
          method: "POST",
          as: "adminA",
          body,
        })
      ).response.status,
    ).toBe(409);
    const path = `/admin/transfers/${encodeURIComponent(created.data.transfer.id)}/review`;
    const decision = {
      action: "approve",
      note: "Approved against independently verified account records.",
      code: code(),
    };
    const results = await Promise.all(
      ["adminA", "adminB"].map((as) =>
        request(path, { method: "POST", as, body: decision }),
      ),
    );
    expect(results.map((result) => result.response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(await balanceOf(sender.id)).toBe(6000);
    expect(await balanceOf(recipient.id)).toBe(4000);
    expect(
      await prisma.ledgerEntry.count({
        where: { referenceId: created.data.transfer.id, kind: "TRANSFER_IN" },
      }),
    ).toBe(1);
    expect(
      (
        await request(path, {
          method: "POST",
          as: "adminA",
          body: { ...decision, action: "reject" },
        })
      ).response.status,
    ).toBe(409);
  });
  test("declining a transfer refunds reserved funds only once", async () => {
    const sender = await financialAccount("Refund sender", 10000),
      recipient = await financialAccount("Refund recipient");
    const created = await request("/admin/transfers", {
      method: "POST",
      as: "adminA",
      body: transferRequest(sender.id, recipient.id, 25),
    });
    expect(created.response.status).toBe(201);
    const results = await Promise.all(
      ["adminA", "adminB"].map((as) =>
        request(
          `/admin/transfers/${encodeURIComponent(created.data.transfer.id)}/review`,
          {
            method: "POST",
            as,
            body: {
              action: "reject",
              note: "Declined after reviewing the sender authorization.",
              code: code(),
            },
          },
        ),
      ),
    );
    expect(results.map((result) => result.response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(await balanceOf(sender.id)).toBe(10000);
    expect(await balanceOf(recipient.id)).toBe(0);
    expect(
      await prisma.ledgerEntry.count({
        where: {
          referenceId: created.data.transfer.id,
          kind: "TRANSFER_REFUND",
        },
      }),
    ).toBe(1);
  });
  test("transfer eligibility is rechecked at approval and sender debits cannot race past available funds", async () => {
    const sender = await financialAccount("Concurrent sender", 10000),
      recipient = await financialAccount("Concurrent recipient");
    const results = await Promise.all([
      request("/admin/transfers", {
        method: "POST",
        as: "adminA",
        body: transferRequest(sender.id, recipient.id, 90),
      }),
      request("/admin/balance-adjustments", {
        method: "POST",
        as: "adminB",
        body: {
          userId: sender.id,
          direction: "debit",
          amount: 90,
          externalReference: "reviewed-debit-2026",
          idempotencyKey: randomUUID(),
          note: "A separately documented balance correction debit.",
          code: code(),
        },
      }),
    ]);
    expect(results.map((result) => result.response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await balanceOf(sender.id)).toBe(1000);
    const created = await request("/admin/transfers", {
      method: "POST",
      as: "adminA",
      body: transferRequest(sender.id, recipient.id, 5),
    });
    expect(created.response.status).toBe(201);
    await prisma.user.update({
      where: { id: recipient.id },
      data: { suspended: true },
    });
    const path = `/admin/transfers/${encodeURIComponent(created.data.transfer.id)}/review`;
    const decision = {
      action: "approve",
      note: "Review after the recipient account status changed.",
      code: code(),
    };
    expect(
      (await request(path, { method: "POST", as: "adminA", body: decision }))
        .response.status,
    ).toBe(409);
    expect(
      (
        await request(path, {
          method: "POST",
          as: "adminA",
          body: { ...decision, action: "reject" },
        })
      ).response.status,
    ).toBe(200);
    expect(await balanceOf(sender.id)).toBe(1000);
  });
  test("administrator funding controls pause and resume all new financial postings", async () => {
    const sender = await financialAccount("Paused sender", 10000),
      recipient = await financialAccount("Paused recipient");
    expect(
      (
        await request("/admin/settings", {
          method: "PATCH",
          as: "adminA",
          body: { fundingEnabled: false },
        })
      ).response.status,
    ).toBe(403);
    try {
      expect(
        (
          await request("/admin/settings", {
            method: "PATCH",
            as: "adminA",
            body: { fundingEnabled: false, code: code() },
          })
        ).data.fundingEnabled,
      ).toBe(false);
      expect(
        (await request("/health", { as: "none" })).data.fundingEnabled,
      ).toBe(false);
      expect(
        (
          await request("/admin/transfers", {
            method: "POST",
            as: "adminA",
            body: transferRequest(sender.id, recipient.id),
          })
        ).response.status,
      ).toBe(503);
      expect(
        (
          await request("/admin/balance-adjustments", {
            method: "POST",
            as: "adminA",
            body: {
              userId: sender.id,
              direction: "credit",
              amount: 1,
              externalReference: "paused-proof-001",
              idempotencyKey: randomUUID(),
              note: "A blocked adjustment during the operator pause.",
              code: code(),
            },
          })
        ).response.status,
      ).toBe(503);
    } finally {
      expect(
        (
          await request("/admin/settings", {
            method: "PATCH",
            as: "adminA",
            body: { fundingEnabled: true, code: code() },
          })
        ).data.fundingEnabled,
      ).toBe(true);
    }
    expect((await request("/health", { as: "none" })).data.fundingEnabled).toBe(
      true,
    );
  });
  test("password reset tokens are single-use and revoke existing sessions", async () => {
    const { randomToken, tokenHash } = await import("../server/crypto");
    const token = randomToken();
    await prisma.token.create({
      data: {
        userId: user.id,
        kind: "RESET_PASSWORD",
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const body = { token, password: "ReplacementSecurePassword99!" };
    expect(
      (
        await request("/auth/reset-password", {
          method: "POST",
          body,
          as: "none",
        })
      ).response.status,
    ).toBe(200);
    expect(
      (
        await request("/auth/reset-password", {
          method: "POST",
          body,
          as: "none",
        })
      ).response.status,
    ).toBe(400);
    expect((await request("/auth/me")).response.status).toBe(401);
  });
});
