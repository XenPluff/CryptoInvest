import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { requireAdmin, requireAuth } from "./auth";
import { platformAnalytics, portfolioAnalytics } from "../lib/analytics";

const ledgerSelect = {
  id: true,
  amountCents: true,
  kind: true,
  referenceId: true,
  createdAt: true,
} as const;
const investmentSelect = {
  id: true,
  planId: true,
  planName: true,
  principalCents: true,
  status: true,
  startTimestamp: true,
  settledAt: true,
} as const;

export const analyticsUserRouter = Router();
analyticsUserRouter.use(requireAuth);
analyticsUserRouter.get("/", async (req, res) => {
  const userId = req.auth!.user.id;
  const result = await prisma.$transaction(
    async (tx) => {
      const [ledger, investments] = await Promise.all([
        tx.ledgerEntry.findMany({
          where: { userId },
          select: ledgerSelect,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        tx.investment.findMany({
          where: { userId },
          select: investmentSelect,
          orderBy: [{ startTimestamp: "asc" }, { id: "asc" }],
        }),
      ]);
      return portfolioAnalytics(ledger, investments);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  res.json(result);
});

export const analyticsAdminRouter = Router();
analyticsAdminRouter.use(requireAuth, requireAdmin);
analyticsAdminRouter.get("/", async (_req, res) => {
  const result = await prisma.$transaction(
    async (tx) => {
      const [
        users,
        ledger,
        investments,
        withdrawals,
        pendingDeposits,
        pendingWithdrawals,
      ] = await Promise.all([
        tx.user.findMany({
          where: { role: "USER" },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        tx.ledgerEntry.findMany({
          where: { user: { role: "USER" } },
          select: ledgerSelect,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        tx.investment.findMany({
          where: { user: { role: "USER" } },
          select: investmentSelect,
          orderBy: [{ startTimestamp: "asc" }, { id: "asc" }],
        }),
        tx.transaction.findMany({
          where: { type: "WITHDRAWAL", status: "PAID", user: { role: "USER" } },
          select: { amountCents: true, reviewedAt: true },
          orderBy: { reviewedAt: "asc" },
        }),
        tx.transaction.count({
          where: { type: "DEPOSIT", status: "PENDING", user: { role: "USER" } },
        }),
        tx.transaction.count({
          where: {
            type: "WITHDRAWAL",
            status: { in: ["PENDING", "APPROVED"] },
            user: { role: "USER" },
          },
        }),
      ]);
      return platformAnalytics({
        users,
        ledger,
        investments,
        withdrawals,
        pendingDeposits,
        pendingWithdrawals,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  res.json(result);
});
