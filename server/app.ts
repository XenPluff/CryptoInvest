import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Prisma, Transaction, Investment, Plan } from "@prisma/client";
import { z, ZodError } from "zod";
import PDFDocument from "pdfkit";
import { prisma } from "./db";
import { readInvestorPortfolio } from "./investor-portfolio";
import { HttpError } from "./errors";
import {
  authRouter,
  requireAuth,
  requireAdmin,
  requireTotp,
  serializeUser,
} from "./auth";
import { config } from "./config";
import { decrypt, encrypt } from "./crypto";
import { emailConfigured } from "./mail";
import { getEmailReadiness } from "./email-readiness";
import {
  assertBalance,
  audit,
  balanceCents,
  serializable,
  toCents,
} from "./finance";
import { notify } from "./notifications";
import { providerStatus } from "./providers";
import { adminFundsRouter } from "./admin-funds";
import { walletConnectRouter } from "./wallet-links";
import { passkeyRouter } from "./passkeys";
import { contentPublicRouter, contentAdminRouter } from "./content";
import { analyticsUserRouter, analyticsAdminRouter } from "./analytics";
import { externalFetch } from "./network";
import { operationsRouter } from "./operations";
import { cardAdminRouter, cardUserRouter } from "./cards";
import { readDepositPrice, signDepositInstructions, verifyDepositInstructions } from "./deposit-pricing";

export const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY_HOPS)
  app.set(
    "trust proxy",
    Math.min(3, Math.max(0, Number(process.env.TRUST_PROXY_HOPS) || 0)),
  );
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute." },
  }),
);
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin !== config.appOrigin || req.get("sec-fetch-site") === "cross-site")
    return next(new HttpError(403, "Request origin is not permitted."));
  if (!req.is("application/json"))
    return next(new HttpError(415, "Send application/json."));
  next();
});
const api = express.Router();
app.use(
  "/api",
  (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  api,
);
api.use("/auth", authRouter);
api.use("/auth/passkeys", passkeyRouter);
api.use("/wallet-connect", requireAuth, walletConnectRouter);
api.use(contentPublicRouter);
api.use("/admin", contentAdminRouter);
api.use("/analytics", analyticsUserRouter);
api.use("/admin/analytics", analyticsAdminRouter);
api.use("/admin/operations", operationsRouter);
api.use("/cards", cardUserRouter);
api.use("/admin/card-applications", cardAdminRouter);
const userId = (req: Request) => req.auth!.user.id;
const money = (cents: number) => cents / 100;
const planJson = (p: Plan) => ({
  ...p,
  minAmount: money(p.minCents),
  maxAmount: money(p.maxCents),
});
const transactionJson = (t: Transaction) => ({
  ...t,
  amount: money(t.amountCents),
});
const investmentJson = (i: Investment) => ({
  ...i,
  principalAmount: money(i.principalCents),
  earnedAmount: money(i.earnedCents),
});
const idParam = (req: Request) => String(req.params.id);
export function normalizeTxHash(network: string, value: string): string {
  const hash = value.trim();
  if (["Ethereum", "ERC20", "BSC"].includes(network)) {
    if (!/^(?:0x)?[0-9a-fA-F]{64}$/.test(hash))
      throw new HttpError(400, "Enter a 32-byte EVM transaction hash.");
    return "0x" + hash.replace(/^0x/, "").toLowerCase();
  }
  if (["Bitcoin", "TRC20"].includes(network)) {
    if (!/^[0-9a-fA-F]{64}$/.test(hash))
      throw new HttpError(400, "Enter the 64-character transaction hash.");
    return hash.toLowerCase();
  }
  if (network === "Solana" && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash))
    return hash;
  throw new HttpError(
    400,
    "Enter a valid transaction signature for the selected network.",
  );
}
const financialLimit = rateLimit({
  windowMs: 900000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many financial requests. Please wait." },
});
api.use(["/deposits", "/withdrawals", "/investments"], (req, res, next) =>
  req.method === "POST" ? financialLimit(req, res, next) : next(),
);
const entrySchema = z.object({ amount: z.union([z.number(), z.string()]) });
const shortText = z.string().trim().min(1).max(200);
async function fundingEnabled() {
  if (!config.fundingEnabled) return false;
  return (
    (await prisma.setting.findUnique({ where: { key: "fundingEnabled" } }))
      ?.value !== "false"
  );
}
async function financialGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!(await fundingEnabled()))
      throw new HttpError(
        503,
        "Funding is not enabled. The operator must complete custody, payment verification, and production configuration.",
      );
    const user = req.auth!.user;
    if (!user.emailVerifiedAt)
      throw new HttpError(403, "Verify your email before financial activity.");
    if (
      (await prisma.kycSubmission.findUnique({ where: { userId: user.id } }))
        ?.status !== "APPROVED"
    )
      throw new HttpError(
        403,
        "An approved identity review is required before financial activity.",
      );
    next();
  } catch (error) {
    next(error);
  }
}
async function adminFinancial(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!(await fundingEnabled()))
      throw new HttpError(503, "Funding is disabled.");
    await requireTotp(req.auth!.user, req.body.code);
    next();
  } catch (error) {
    next(error);
  }
}
api.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      emailConfigured,
      emailDeliveryStatus: getEmailReadiness().status,
      fundingEnabled: await fundingEnabled(),
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      database: "unavailable",
      emailConfigured,
      emailDeliveryStatus: getEmailReadiness().status,
      fundingEnabled: false,
    });
  }
});
api.get("/plans", async (_req, res) =>
  res.json({
    plans: (
      await prisma.plan.findMany({
        where: { active: true },
        orderBy: { minCents: "asc" },
      })
    ).map(planJson),
  }),
);
type MarketCurrency = "USD" | "EUR" | "GBP";
type MarketSnapshot = {
  assets: unknown[];
  currency: MarketCurrency;
  updatedAt: string;
  source: string;
  stale: boolean;
};
const marketCache = new Map<
  MarketCurrency,
  { loadedAt: number; snapshot: MarketSnapshot }
>();
const marketPending = new Map<MarketCurrency, Promise<void>>();
api.get("/markets", async (req, res) => {
  const currency = z
    .enum(["USD", "EUR", "GBP"])
    .parse(req.query.currency ?? "USD");
  if (Date.now() - (marketCache.get(currency)?.loadedAt ?? 0) > 60000) {
    if (!marketPending.has(currency))
      marketPending.set(
        currency,
        (async () => {
          const response = await externalFetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.toLowerCase()}&ids=bitcoin,ethereum,solana,binancecoin,tether&order=market_cap_desc&per_page=5&page=1&sparkline=false`,
            {
              signal: AbortSignal.timeout(7000),
              headers: { accept: "application/json" },
            },
          );
          if (!response.ok) throw new Error("Provider unavailable");
          const data = z
            .array(
              z.object({
                id: z.string(),
                symbol: z.string(),
                name: z.string(),
                current_price: z.number().nonnegative(),
                price_change_percentage_24h: z.number().nullable(),
              }),
            )
            .min(1)
            .parse(await response.json());
          marketCache.set(currency, {
            loadedAt: Date.now(),
            snapshot: {
              assets: data.map((a) => ({
                id: a.id,
                symbol: a.symbol.toUpperCase(),
                name: a.name,
                price: a.current_price,
                change24h: a.price_change_percentage_24h,
              })),
              currency,
              updatedAt: new Date().toISOString(),
              source: "CoinGecko",
              stale: false,
            },
          });
        })().finally(() => {
          marketPending.delete(currency);
        }),
      );
    try {
      await marketPending.get(currency);
    } catch {
      const cached = marketCache.get(currency);
      if (!cached || Date.now() - cached.loadedAt > 900000)
        return res.status(503).json({
          error:
            "Live market provider is temporarily unavailable. No prices have been generated.",
        });
      return res.json({ ...cached.snapshot, stale: true });
    }
  }
  res.json(marketCache.get(currency)!.snapshot);
});
api.get("/wallets", requireAuth, async (_req, res) =>
  res.json({
    wallets: await prisma.wallet.findMany({
      where: { active: true },
      orderBy: { asset: "asc" },
    }),
    fundingEnabled: await fundingEnabled(),
  }),
);
api.get("/dashboard", requireAuth, async (req, res) => {
  const id = userId(req);
  const result = await prisma.$transaction(async tx => {
    const [balance, portfolio, transactions, notifications, referrals] = await Promise.all([
      balanceCents(tx, id),
      readInvestorPortfolio(tx, id),
      tx.transaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
      tx.notification.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      tx.ledgerEntry.aggregate({ where: { userId: id, kind: "REFERRAL_COMMISSION" }, _sum: { amountCents: true } }),
    ]);
    return { ...portfolio, balance: money(balance), invested: money(portfolio.summary.activePrincipalCents),
      referralEarnings: money(referrals._sum.amountCents ?? 0),
      transactions: transactions.map(transactionJson), notifications };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json({ ...result, user: await serializeUser(req.auth!.user) });
});
api.get("/transactions", requireAuth, async (req, res) =>
  res.json({
    transactions: (
      await prisma.transaction.findMany({
        where: { userId: userId(req) },
        orderBy: { createdAt: "desc" },
        take: 500,
      })
    ).map(transactionJson),
  }),
);
api.get("/investments", requireAuth, async (req, res) => {
  const result = await prisma.$transaction(tx => readInvestorPortfolio(tx, userId(req)),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json(result);
});
api.get("/deposit-price", requireAuth, async (req, res) => {
  const asset = z.enum(["BTC", "ETH", "USDT", "BNB", "SOL"]).parse(req.query.asset);
  res.json({ price: await readDepositPrice(asset) });
});
api.post("/deposits/quote", requireAuth, financialGuard, async (req, res) => {
  const body = entrySchema.extend({ walletId: shortText }).parse(req.body);
  const amountCents = toCents(body.amount);
  const wallet = await prisma.wallet.findFirst({ where: { id: body.walletId, active: true } });
  if (!wallet) throw new HttpError(400, "Unsupported deposit network.");
  const price = await readDepositPrice(wallet.asset);
  res.json({ quote: signDepositInstructions(userId(req), wallet, amountCents, price, config.jwtSecret) });
});
api.post("/deposits", requireAuth, financialGuard, async (req, res) => {
  const body = entrySchema
    .extend({
      walletId: shortText,
      quoteToken: z.string().max(5000).optional(),
      txHash: z
        .string()
        .trim()
        .regex(
          /^[A-Za-z0-9]{32,128}$/,
          "Enter the transaction hash supplied by your wallet.",
        ),
    })
    .parse(req.body);
  const wallet = await prisma.wallet.findFirst({
    where: { id: body.walletId, active: true },
  });
  if (!wallet) throw new HttpError(400, "Unsupported deposit network.");
  const amountCents = toCents(body.amount);
  const quote = body.quoteToken ? verifyDepositInstructions(body.quoteToken, userId(req), config.jwtSecret) : null;
  if (quote && (quote.walletId !== wallet.id || quote.asset !== wallet.asset || quote.network !== wallet.network || quote.address !== wallet.address || quote.amountCents !== amountCents))
    throw new HttpError(400, "The deposit details do not match the payment instructions. Contact support if funds have already been sent.");
  const txHash = normalizeTxHash(wallet.network, body.txHash);
  const deposit = await serializable(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId: userId(req),
        walletId: wallet.id,
        type: "DEPOSIT",
        amountCents,
        asset: wallet.asset,
        network: wallet.network,
        txHash,
        ...(quote ? { note: `Payment instructions: ${quote.cryptoAmount} ${quote.asset}; declared USD ${(amountCents / 100).toFixed(2)}; ${quote.source} USD price ${quote.priceUsd}; captured ${quote.quotedAt}. Independently verify the received amount and USD credit.` } : {}),
      },
    });
    if (quote) await audit(tx, userId(req), "DEPOSIT_INSTRUCTIONS_REPORTED", transaction.id, quote, req.ip);
    await notify(
      tx,
      userId(req),
      "Deposit submitted",
      "Your transfer is pending independent on-chain verification. Your available balance has not been credited.",
    );
    return transaction;
  });
  res.status(201).json({ deposit: transactionJson(deposit) });
});
api.post("/withdrawals", requireAuth, financialGuard, async (req, res) => {
  const body = entrySchema
    .extend({
      asset: shortText,
      network: shortText,
      address: z.string().trim().min(20).max(200),
    })
    .parse(req.body);
  const wallet = await prisma.wallet.findUnique({
    where: { asset_network: { asset: body.asset, network: body.network } },
  });
  if (!wallet?.active)
    throw new HttpError(400, "Unsupported withdrawal network.");
  if (
    ["Ethereum", "ERC20", "BSC"].includes(body.network) &&
    !/^0x[0-9a-fA-F]{40}$/.test(body.address)
  )
    throw new HttpError(400, "Enter a valid EVM destination address.");
  if (
    body.network === "Bitcoin" &&
    !/^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(body.address)
  )
    throw new HttpError(400, "Enter a valid Bitcoin destination address.");
  if (
    body.network === "TRC20" &&
    !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(body.address)
  )
    throw new HttpError(400, "Enter a valid TRON destination address.");
  if (
    body.network === "Solana" &&
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.address)
  )
    throw new HttpError(400, "Enter a valid Solana destination address.");
  const amount = toCents(body.amount);
  const withdrawal = await serializable(async (tx) => {
    // Lock the live enrollment state so enabling 2FA cannot race a withdrawal.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId(req)} FOR UPDATE`;
    const account = await tx.user.findUniqueOrThrow({ where: { id: userId(req) } });
    if (account.suspended) throw new HttpError(403, "This account is suspended.");
    if (account.twoFactorEnabled) await requireTotp(account, req.body.code);
    await assertBalance(tx, userId(req), amount);
    const t = await tx.transaction.create({
      data: {
        userId: userId(req),
        type: "WITHDRAWAL",
        amountCents: amount,
        asset: body.asset,
        network: body.network,
        address: body.address,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: userId(req),
        amountCents: -amount,
        kind: "WITHDRAWAL_RESERVE",
        referenceId: t.id,
      },
    });
    await notify(
      tx,
      userId(req),
      "Withdrawal requested",
      "Funds are reserved while your withdrawal is reviewed. No on-chain transfer has been made yet.",
    );
    return t;
  });
  res.status(201).json({ withdrawal: transactionJson(withdrawal) });
});
api.post("/investments", requireAuth, financialGuard, async (req, res) => {
  const body = entrySchema.extend({ planId: shortText }).parse(req.body);
  const amount = toCents(body.amount);
  const investment = await serializable(async (tx) => {
    const plan = await tx.plan.findFirst({
      where: { id: body.planId, active: true },
    });
    if (!plan) throw new HttpError(404, "This plan is unavailable.");
    if (amount < plan.minCents || amount > plan.maxCents)
      throw new HttpError(
        400,
        "The amount is outside this plan’s investment limits.",
      );
    await assertBalance(tx, userId(req), amount);
    const i = await tx.investment.create({
      data: {
        userId: userId(req),
        planId: plan.id,
        planName: plan.name,
        planSlug: plan.slug,
        principalCents: amount,
        dailyRate: plan.dailyRate,
        monthlyRate: plan.monthlyRate,
        durationDays: plan.durationDays,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: userId(req),
        amountCents: -amount,
        kind: "INVESTMENT_PRINCIPAL",
        referenceId: i.id,
      },
    });
    await tx.transaction.create({
      data: {
        userId: userId(req),
        type: "INVESTMENT",
        amountCents: amount,
        status: "ACTIVE",
        note: `Investment ${i.id}`,
      },
    });
    await notify(
      tx,
      userId(req),
      "Investment activated",
      `${plan.name} allocation recorded. The live growth display is a target estimate; realized proceeds are posted after operator reconciliation.`,
    );
    return i;
  });
  res.status(201).json({ investment: investmentJson(investment) });
});
api.patch("/profile", requireAuth, async (req, res) => {
  const body = z
    .object({ name: z.string().trim().min(2).max(100) })
    .parse(req.body);
  const user = await prisma.user.update({
    where: { id: userId(req) },
    data: body,
  });
  res.json({ user: await serializeUser(user) });
});
api.post("/kyc", requireAuth, async (req, res) => {
  if (!req.auth!.user.emailVerifiedAt)
    throw new HttpError(403, "Verify your email before identity submission.");
  const body = z
    .object({
      fullName: z.string().trim().min(2).max(120),
      country: z.string().trim().min(2).max(80),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      documentType: z.enum([
        "passport",
        "national_id",
        "drivers_license",
        "Passport",
        "National ID",
        "Driver’s license",
        "Driver License",
        "National ID card",
        "Driver license",
      ]),
      documentNumber: z.string().trim().min(4).max(100),
    })
    .parse(req.body);
  const dob = new Date(body.dateOfBirth + "T00:00:00Z");
  const adult = new Date();
  adult.setUTCFullYear(adult.getUTCFullYear() - 18);
  if (
    !Number.isFinite(dob.getTime()) ||
    dob.toISOString().slice(0, 10) !== body.dateOfBirth ||
    dob > adult ||
    dob.getUTCFullYear() < 1900
  )
    throw new HttpError(
      400,
      "A valid date of birth showing age 18 or older is required.",
    );
  const existing = await prisma.kycSubmission.findUnique({
    where: { userId: userId(req) },
  });
  if (existing && existing.status !== "REJECTED")
    throw new HttpError(
      409,
      "An identity submission is already pending or approved.",
    );
  const data = {
    encryptedPayload: encrypt(JSON.stringify(body)),
    country: body.country,
    documentType: body.documentType,
    status: "PENDING" as const,
    reviewNote: null,
    reviewedAt: null,
    reviewedById: null,
  };
  await prisma.kycSubmission.upsert({
    where: { userId: userId(req) },
    create: { userId: userId(req), ...data },
    update: data,
  });
  res.status(201).json({
    message:
      "Identity details received for manual review. This submission does not replace a regulated identity/AML verification provider.",
  });
});
api.get("/kyc", requireAuth, async (req, res) => {
  const kyc = await prisma.kycSubmission.findUnique({
    where: { userId: userId(req) },
    select: {
      id: true,
      status: true,
      country: true,
      documentType: true,
      reviewNote: true,
      createdAt: true,
      reviewedAt: true,
    },
  });
  res.json({ kyc });
});
api.get("/referrals", requireAuth, async (req, res) => {
  const referrals = await prisma.user.findMany({
    where: { referredById: userId(req) },
    select: { id: true, name: true, createdAt: true },
  });
  const commissions = await prisma.ledgerEntry.findMany({
    where: { userId: userId(req), kind: "REFERRAL_COMMISSION" },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    referralCode: req.auth!.user.referralCode,
    referrals,
    commissions: commissions.map((c) => ({
      ...c,
      amount: money(c.amountCents),
    })),
    totalEarned: money(commissions.reduce((s, c) => s + c.amountCents, 0)),
    commissionPolicy:
      "Commissions are credited only after an operator verifies funded, realized entitlement. No automatic or multi-level commission schedule is active.",
  });
});
api.get("/notifications", requireAuth, async (req, res) =>
  res.json({
    notifications: await prisma.notification.findMany({
      where: { userId: userId(req) },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  }),
);
api.post("/notifications/read", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: userId(req), readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ message: "Notifications marked as read." });
});
const publicLimit = rateLimit({
  windowMs: 3600000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Please try again later." },
});
api.post("/contact", publicLimit, async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z
        .email()
        .max(254)
        .transform((s) => s.toLowerCase()),
      subject: z.string().trim().min(3).max(200),
      message: z.string().trim().min(10).max(5000),
    })
    .parse(req.body);
  await prisma.contactMessage.create({ data: body });
  res
    .status(201)
    .json({ message: "Your message has been saved for the support team." });
});
api.get("/statements", requireAuth, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: userId(req) },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });
  const balance = await balanceCents(prisma, userId(req));
  res
    .type("application/pdf")
    .set("Content-Disposition", 'attachment; filename="aureon-statement.pdf"')
    .set("Cache-Control", "no-store");
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(24).text("AUREON | Account statement");
  doc
    .moveDown()
    .fontSize(10)
    .text(`Account: ${req.auth!.user.name}`)
    .text(`Generated UTC: ${new Date().toISOString()}`)
    .text(`Available USD balance: $${money(balance).toFixed(2)}`)
    .moveDown()
    .text(
      "This statement records platform entries. It does not certify external custody or guarantee returns.",
    );
  for (const t of transactions) {
    if (doc.y > 710) doc.addPage();
    doc
      .moveDown(0.7)
      .text(
        `${t.createdAt.toISOString().slice(0, 10)}  ${t.type}${t.direction ? " " + t.direction : ""}  $${money(t.amountCents).toFixed(2)}  ${t.status}`,
      )
      .fontSize(8)
      .text(`Reference ${t.id}${t.txHash ? " | Hash " + t.txHash : ""}`)
      .fontSize(10);
  }
  if (!transactions.length)
    doc.moveDown().text("No transactions have been recorded.");
  doc.end();
});
// Operator-only routes. Financial posting requires a fresh TOTP proof and immutable audit entries.
const admin = express.Router();
api.use("/admin", requireAuth, requireAdmin, admin);
admin.use(
  rateLimit({
    windowMs: 900000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many administrator requests. Please wait." },
  }),
);
admin.get("/overview", async (_req, res) => {
  const [
    totalUsers,
    activeInvestors,
    depositSum,
    withdrawalSum,
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    users,
    transactions,
    auditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.investment.findMany({
      where: { status: "ACTIVE" },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "APPROVED" },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "WITHDRAWAL", status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.transaction.count({ where: { type: "DEPOSIT", status: "PENDING" } }),
    prisma.transaction.count({
      where: { type: "WITHDRAWAL", status: { in: ["PENDING", "APPROVED"] } },
    }),
    prisma.kycSubmission.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspended: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        createdAt: true,
        kyc: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.transaction.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  res.json({
    totalUsers,
    activeInvestors: activeInvestors.length,
    totalDeposits: money(depositSum._sum.amountCents || 0),
    totalWithdrawals: money(withdrawalSum._sum.amountCents || 0),
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    users,
    transactions: transactions.map(transactionJson),
    auditLogs,
  });
});
admin.use(adminFundsRouter(adminFinancial));
admin.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspended: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      referralCode: true,
      createdAt: true,
      kyc: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const balances = await prisma.ledgerEntry.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((user) => user.id) } },
    _sum: { amountCents: true },
  });
  const amounts = new Map(
    balances.map((balance) => [balance.userId, balance._sum.amountCents || 0]),
  );
  res.json({
    users: users.map((user) => ({
      ...user,
      balance: money(amounts.get(user.id) || 0),
    })),
  });
});
admin.patch("/users/:id", async (req, res) => {
  const body = z
    .object({
      suspended: z.boolean().optional(),
      name: z.string().trim().min(2).max(100).optional(),
    })
    .refine((b) => Object.keys(b).length > 0)
    .parse(req.body);
  if (idParam(req) === userId(req) && body.suspended)
    throw new HttpError(
      400,
      "You cannot suspend your current administrator account.",
    );
  const user = await serializable(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: idParam(req) } });
    if (!target) throw new HttpError(404, "User not found.");
    if (target.role === "ADMIN")
      throw new HttpError(
        403,
        "Administrator account changes require the separate operator account-management process.",
      );
    const updated = await tx.user.update({
      where: { id: target.id },
      data: body,
    });
    if (body.suspended)
      await tx.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await audit(tx, userId(req), "USER_UPDATED", target.id, body, req.ip);
    return updated;
  });
  res.json({ user: await serializeUser(user) });
});
for (const [path, type] of [
  ["deposits", "DEPOSIT"],
  ["withdrawals", "WITHDRAWAL"],
] as const) {
  admin.get("/" + path, async (_req, res) =>
    res.json({
      [path]: (
        await prisma.transaction.findMany({
          where: { type },
          include: {
            user: { select: { id: true, name: true, email: true } },
            wallet: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1000,
        })
      ).map(transactionJson),
    }),
  );
}
admin.post("/deposits/:id/review", adminFinancial, async (req, res) => {
  const body = z
    .object({
      action: z.enum(["approve", "reject"]),
      note: z.string().trim().min(15).max(1000).optional(),
      confirmedAmount: z.union([z.number(), z.string()]).optional(),
      ownershipEvidence: z.string().trim().min(20).max(1000).optional(),
      verificationReference: z.string().trim().min(8).max(200).optional(),
    })
    .parse(req.body);
  if (body.action === "approve" && body.confirmedAmount === undefined)
    throw new HttpError(400, "Approval requires a confirmed USD amount.");
  const reviewNote = body.note ?? (body.action === "approve"
    ? "Deposit approved by administrator."
    : "Deposit declined by administrator.");
  const deposit = await serializable(async (tx) => {
    const t = await tx.transaction.findFirst({
      where: { id: idParam(req), type: "DEPOSIT" },
    });
    if (!t) throw new HttpError(404, "Deposit not found.");
    if (t.status !== "PENDING")
      throw new HttpError(409, "This deposit has already been reviewed.");
    if (t.userId === userId(req))
      throw new HttpError(
        403,
        "Administrators cannot approve their own deposits.",
      );
    const amount =
      body.action === "approve" ? toCents(body.confirmedAmount) : t.amountCents;
    const reviewed = await tx.transaction.update({
      where: { id: t.id },
      data: {
        status: body.action === "approve" ? "APPROVED" : "REJECTED",
        amountCents: amount,
        note: reviewNote,
        reviewedAt: new Date(),
        reviewedById: userId(req),
      },
    });
    if (body.action === "approve")
      await tx.ledgerEntry.create({
        data: {
          userId: t.userId,
          amountCents: amount,
          kind: "VERIFIED_DEPOSIT",
          referenceId: t.id,
        },
      });
    await audit(
      tx,
      userId(req),
      "DEPOSIT_" + body.action.toUpperCase(),
      t.id,
      {
        note: reviewNote,
        confirmedAmountCents: amount,
        declaredAmountCents: t.amountCents,
        ownershipEvidence: body.ownershipEvidence || null,
        verificationReference: body.verificationReference || null,
      },
      req.ip,
    );
    await notify(
      tx,
      t.userId,
      body.action === "approve" ? "Deposit verified" : "Deposit rejected",
      body.action === "approve"
        ? `$${money(amount).toFixed(2)} credited after manual verification.`
        : "The transfer could not be approved. Contact support for the review outcome.",
    );
    return reviewed;
  });
  res.json({ deposit: transactionJson(deposit) });
});
admin.post("/withdrawals/:id/review", adminFinancial, async (req, res) => {
  const body = z
    .object({
      action: z.enum(["approve", "reject", "paid"]),
      note: z.string().trim().min(15).max(1000),
      txHash: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9]{32,128}$/)
        .optional(),
    })
    .parse(req.body);
  if (body.action === "paid" && !body.txHash)
    throw new HttpError(
      400,
      "An independently verified on-chain payout hash is required.",
    );
  const withdrawal = await serializable(async (tx) => {
    const t = await tx.transaction.findFirst({
      where: { id: idParam(req), type: "WITHDRAWAL" },
    });
    if (!t) throw new HttpError(404, "Withdrawal not found.");
    if (t.userId === userId(req))
      throw new HttpError(
        403,
        "Administrators cannot review their own withdrawals.",
      );
    if (
      (body.action === "approve" && t.status !== "PENDING") ||
      (body.action === "reject" &&
        !["PENDING", "APPROVED"].includes(t.status)) ||
      (body.action === "paid" && t.status !== "APPROVED")
    )
      throw new HttpError(409, "This transition is not permitted.");
    if (body.action === "paid" && t.reviewedById === userId(req))
      throw new HttpError(
        403,
        "A second administrator must independently reconcile and mark the payout paid.",
      );
    const txHash = body.txHash
      ? normalizeTxHash(t.network || "", body.txHash)
      : undefined;
    const updated = await tx.transaction.update({
      where: { id: t.id },
      data: {
        status:
          body.action === "approve"
            ? "APPROVED"
            : body.action === "reject"
              ? "REJECTED"
              : "PAID",
        note: body.note,
        reviewedById: userId(req),
        reviewedAt: new Date(),
        ...(body.action === "paid" ? { txHash } : {}),
      },
    });
    if (body.action === "reject")
      await tx.ledgerEntry.create({
        data: {
          userId: t.userId,
          amountCents: t.amountCents,
          kind: "WITHDRAWAL_REFUND",
          referenceId: t.id,
        },
      });
    await audit(
      tx,
      userId(req),
      "WITHDRAWAL_" + body.action.toUpperCase(),
      t.id,
      { note: body.note, txHash: txHash || null },
      req.ip,
    );
    await notify(
      tx,
      t.userId,
      "Withdrawal " + body.action,
      body.action === "reject"
        ? "Your withdrawal was rejected and its reserved funds restored."
        : body.action === "paid"
          ? "Your payout has been recorded with an on-chain transaction hash."
          : "Your withdrawal was approved. It is awaiting external transfer and independent reconciliation.",
    );
    return updated;
  });
  res.json({ withdrawal: transactionJson(withdrawal) });
});
admin.get("/investments", async (_req, res) =>
  res.json({
    investments: (
      await prisma.investment.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { startTimestamp: "desc" },
        take: 1000,
      })
    ).map(investmentJson),
  }),
);
admin.post("/investments/:id/settle", adminFinancial, async (req, res) => {
  const body = z
    .object({
      principalReturned: z.union([z.number(), z.string()]),
      realizedEarnings: z.union([z.number(), z.string()]),
      externalReference: z.string().trim().min(8).max(200),
      note: z.string().trim().min(30).max(1000),
    })
    .parse(req.body);
  const principalReturned = /^0(?:\.0{1,2})?$/.test(
    String(body.principalReturned),
  )
    ? 0
    : toCents(body.principalReturned);
  const realizedEarnings = /^0(?:\.0{1,2})?$/.test(
    String(body.realizedEarnings),
  )
    ? 0
    : toCents(body.realizedEarnings);
  const investment = await serializable(async (tx) => {
    const i = await tx.investment.findUnique({ where: { id: idParam(req) } });
    if (!i) throw new HttpError(404, "Investment not found.");
    if (i.status !== "ACTIVE")
      throw new HttpError(409, "This investment is already settled.");
    if (i.userId === userId(req))
      throw new HttpError(
        403,
        "Administrators cannot settle their own investments.",
      );
    if (Date.now() < i.startTimestamp.getTime() + i.durationDays * 86400000)
      throw new HttpError(409, "This investment has not reached maturity.");
    if (principalReturned > i.principalCents)
      throw new HttpError(
        400,
        "Principal returned cannot exceed the original principal. Record any genuine additional proceeds as realized earnings.",
      );
    await tx.ledgerEntry.createMany({
      data: [
        {
          userId: i.userId,
          amountCents: principalReturned,
          kind: "PRINCIPAL_RETURN",
          referenceId: i.id,
        },
        {
          userId: i.userId,
          amountCents: realizedEarnings,
          kind: "REALIZED_EARNINGS",
          referenceId: i.id,
        },
      ],
    });
    const updated = await tx.investment.update({
      where: { id: i.id },
      data: {
        status: "SETTLED",
        earnedCents: realizedEarnings,
        settledAt: new Date(),
      },
    });
    await tx.transaction.create({
      data: {
        userId: i.userId,
        type: "RETURN",
        amountCents: principalReturned + realizedEarnings,
        status: "SETTLED",
        note: `Reconciled settlement ${i.id}; reference ${body.externalReference}`,
      },
    });
    await audit(
      tx,
      userId(req),
      "INVESTMENT_SETTLED",
      i.id,
      {
        principalReturnedCents: principalReturned,
        realizedEarningsCents: realizedEarnings,
        externalReference: body.externalReference,
        note: body.note,
      },
      req.ip,
    );
    await notify(
      tx,
      i.userId,
      "Investment settled",
      "Reconciled proceeds have been posted to your available balance. Actual returns may differ from target estimates.",
    );
    return updated;
  });
  res.json({ investment: investmentJson(investment) });
});
admin.get("/kyc", async (_req, res) => {
  const submissions = await prisma.kycSubmission.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({
    submissions: submissions.map(({ encryptedPayload, ...s }) => ({
      ...s,
      ...JSON.parse(decrypt(encryptedPayload)),
    })),
  });
});
admin.post("/kyc/:id/review", async (req, res) => {
  await requireTotp(req.auth!.user, req.body.code);
  const body = z
    .object({
      action: z.enum(["approve", "reject"]),
      note: z.string().trim().min(10).max(1000),
    })
    .parse(req.body);
  await serializable(async (tx) => {
    const k = await tx.kycSubmission.findUnique({
      where: { id: idParam(req) },
    });
    if (!k) throw new HttpError(404, "Submission not found.");
    if (k.userId === userId(req))
      throw new HttpError(
        403,
        "You cannot approve your own identity submission.",
      );
    if (k.status !== "PENDING")
      throw new HttpError(409, "Submission already reviewed.");
    await tx.kycSubmission.update({
      where: { id: k.id },
      data: {
        status: body.action === "approve" ? "APPROVED" : "REJECTED",
        reviewNote: body.note,
        reviewedAt: new Date(),
        reviewedById: userId(req),
      },
    });
    await audit(
      tx,
      userId(req),
      "KYC_" + body.action.toUpperCase(),
      k.id,
      { note: body.note },
      req.ip,
    );
    await notify(
      tx,
      k.userId,
      "Identity review complete",
      body.action === "approve"
        ? "Your submitted identity metadata has been approved by the operator."
        : "Your identity submission requires changes. Review the note in account settings.",
    );
  });
  res.json({ message: "Identity review saved." });
});
const planSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  dailyRate: z.number().min(0).max(1),
  monthlyRate: z.number().min(0).max(2),
  minAmount: z.union([z.string(), z.number()]),
  maxAmount: z.union([z.string(), z.number()]),
  durationDays: z.number().int().min(1).max(3650),
  description: z.string().trim().min(10).max(1000),
  active: z.boolean(),
});
admin.get("/plans", async (_req, res) =>
  res.json({
    plans: (await prisma.plan.findMany({ orderBy: { minCents: "asc" } })).map(
      planJson,
    ),
  }),
);
admin.post("/plans", async (req, res) => {
  const b = planSchema.parse(req.body);
  const { minAmount, maxAmount, ...data } = b;
  const minCents = toCents(minAmount),
    maxCents = toCents(maxAmount);
  if (maxCents < minCents)
    throw new HttpError(400, "Maximum must be at least the minimum.");
  if (b.dailyRate > 0 && b.monthlyRate > 0)
    throw new HttpError(400, "Select a daily or monthly rate.");
  const plan = await serializable(async (tx) => {
    const p = await tx.plan.create({ data: { ...data, minCents, maxCents } });
    await audit(
      tx,
      userId(req),
      "PLAN_CREATED",
      p.id,
      { slug: p.slug },
      req.ip,
    );
    return p;
  });
  res.status(201).json({ plan: planJson(plan) });
});
admin.patch("/plans/:id", async (req, res) => {
  const b = planSchema.partial().parse(req.body);
  const { minAmount, maxAmount, ...rest } = b;
  const plan = await serializable(async (tx) => {
    const current = await tx.plan.findUnique({ where: { id: idParam(req) } });
    if (!current) throw new HttpError(404, "Plan not found.");
    const data = {
      ...rest,
      ...(minAmount !== undefined ? { minCents: toCents(minAmount) } : {}),
      ...(maxAmount !== undefined ? { maxCents: toCents(maxAmount) } : {}),
    };
    const next = { ...current, ...data };
    if (
      next.maxCents < next.minCents ||
      (next.dailyRate > 0 && next.monthlyRate > 0)
    )
      throw new HttpError(400, "Plan limits or rate combination is invalid.");
    const p = await tx.plan.update({ where: { id: current.id }, data });
    await audit(tx, userId(req), "PLAN_UPDATED", p.id, data, req.ip);
    return p;
  });
  res.json({ plan: planJson(plan) });
});
admin.get("/audit", async (_req, res) =>
  res.json({
    logs: await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  }),
);
admin.get("/messages", async (_req, res) =>
  res.json({
    messages: await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  }),
);
admin.get("/providers", async (_req, res) => res.json(await providerStatus()));
admin.get("/email-delivery", async (_req, res) => {
  const [pending, sent, failed, cancelled] = await Promise.all([
    prisma.emailOutbox.count({
      where: { sentAt: null, cancelledAt: null, attempts: { lt: 10 } },
    }),
    prisma.emailOutbox.count({ where: { sentAt: { not: null } } }),
    prisma.emailOutbox.count({
      where: { sentAt: null, cancelledAt: null, attempts: { gte: 10 } },
    }),
    prisma.emailOutbox.count({ where: { cancelledAt: { not: null } } }),
  ]);
  res.json({
    pending,
    sent,
    failed,
    cancelled,
    note: "Sent means accepted by the email provider. Inbox delivery is not independently verified.",
  });
});
admin.get("/settings", async (_req, res) =>
  res.json({
    fundingEnabled: await fundingEnabled(),
    fundingConfigured: config.fundingEnabled,
    emailConfigured,
  }),
);
admin.patch("/settings", async (req, res) => {
  await requireTotp(req.auth!.user, req.body.code);
  const body = z.object({ fundingEnabled: z.boolean() }).parse(req.body);
  if (body.fundingEnabled && !config.fundingEnabled)
    throw new HttpError(
      409,
      "Set FUNDING_ENABLED=true in the operator deployment environment after validating custody and settlement. The dashboard cannot bypass that gate.",
    );
  await serializable(async (tx) => {
    await tx.setting.upsert({
      where: { key: "fundingEnabled" },
      create: { key: "fundingEnabled", value: String(body.fundingEnabled) },
      update: { value: String(body.fundingEnabled) },
    });
    await audit(
      tx,
      userId(req),
      "FUNDING_SETTING_CHANGED",
      "fundingEnabled",
      body,
      req.ip,
    );
  });
  res.json({ fundingEnabled: await fundingEnabled(), emailConfigured });
});
api.use((_req, res) => res.status(404).json({ error: "API route not found." }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError)
    return res.status(error.status).json({ error: error.message });
  if (error instanceof ZodError)
    return res.status(400).json({
      error: error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 3)
        .join("; "),
    });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return res.status(409).json({
        error: "That record or transaction reference already exists.",
      });
    if (error.code === "P2025")
      return res.status(404).json({ error: "Record not found." });
    if (error.code === "P2034")
      return res
        .status(409)
        .json({ error: "Concurrent account operation. Please retry." });
  }
  if (error instanceof SyntaxError)
    return res.status(400).json({ error: "Invalid JSON request." });
  console.error(
    "API request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  res.status(500).json({
    error:
      "The service could not complete this request. Please try again or contact support.",
  });
});
export default app;
