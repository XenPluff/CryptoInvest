import { Router, type RequestHandler } from "express";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { HttpError } from "./errors";
import {
  assertBalance,
  audit,
  balanceCents,
  serializable,
  toCents,
} from "./finance";
import { notify } from "./notifications";

const accountSelect = { id: true, name: true, email: true } as const;
const requestSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  note: z.string().trim().min(15).max(1000),
  idempotencyKey: z.string().uuid(),
});
async function transferAccount(tx: Prisma.TransactionClient, id: string) {
  const user = await tx.user.findUnique({
    where: { id },
    include: { kyc: true },
  });
  if (!user) throw new HttpError(404, "Transfer account not found.");
  if (
    user.suspended ||
    !user.emailVerifiedAt ||
    !user.twoFactorEnabled ||
    user.kyc?.status !== "APPROVED"
  )
    throw new HttpError(
      409,
      "Both transfer accounts must be active, email verified, identity approved, and protected by two-factor authentication.",
    );
  return user;
}
const transferJson = (transfer: { amountCents: number }) => ({
  ...transfer,
  amount: transfer.amountCents / 100,
});

/** Mounted behind the administrator role and enrolled-TOTP middleware. */
export function adminFundsRouter(financial: RequestHandler) {
  const router = Router();
  router.get("/users/:id/ledger", async (req, res) => {
    const id = String(req.params.id);
    if (
      !(await prisma.user.findUnique({ where: { id }, select: { id: true } }))
    )
      throw new HttpError(404, "Investor not found.");
    const [balance, entries] = await Promise.all([
      balanceCents(prisma, id),
      prisma.ledgerEntry.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    res.json({
      balance: balance / 100,
      entries: entries.map((entry) => ({
        ...entry,
        amount: entry.amountCents / 100,
      })),
    });
  });
  router.post("/balance-adjustments", financial, async (req, res) => {
    const body = requestSchema
      .extend({
        userId: z.string().min(1),
        direction: z.enum(["credit", "debit"]),
        externalReference: z.string().trim().min(8).max(200),
      })
      .parse(req.body);
    const amount = toCents(body.amount),
      actor = req.auth!.user.id;
    if (body.userId === actor)
      throw new HttpError(
        403,
        "You cannot adjust your own administrator balance.",
      );
    const id = `adjustment:${body.idempotencyKey}`;
    const result = await serializable(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: body.userId } });
      if (!target) throw new HttpError(404, "Investor not found.");
      if (body.direction === "debit")
        await assertBalance(tx, target.id, amount);
      const transaction = await tx.transaction.create({
        data: {
          id,
          userId: target.id,
          type: "ADJUSTMENT",
          amountCents: amount,
          direction: body.direction === "credit" ? "CREDIT" : "DEBIT",
          status: "SETTLED",
          asset: "USD",
          network: "Account balance",
          note: body.note,
          reviewedById: actor,
          reviewedAt: new Date(),
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: target.id,
          amountCents: body.direction === "credit" ? amount : -amount,
          kind: body.direction === "credit" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
          referenceId: id,
        },
      });
      await audit(
        tx,
        actor,
        "BALANCE_ADJUSTMENT",
        id,
        {
          userId: target.id,
          direction: body.direction,
          amountCents: amount,
          externalReference: body.externalReference,
          note: body.note,
        },
        req.ip,
      );
      await notify(
        tx,
        target.id,
        "Balance adjustment recorded",
        `An administrator recorded a USD ${body.direction} of $${(amount / 100).toFixed(2)}. Review your transaction history or contact support for details.`,
      );
      return {
        transaction: { ...transaction, amount: amount / 100 },
        balance: (await balanceCents(tx, target.id)) / 100,
      };
    });
    res
      .status(201)
      .json({
        ...result,
        message: "Balance adjustment recorded in the ledger.",
      });
  });
  router.get("/transactions", async (req, res) => {
    const filter = z
      .object({
        type: z.nativeEnum(TransactionType).optional(),
        status: z.nativeEnum(TransactionStatus).optional(),
      })
      .parse(req.query);
    const transactions = await prisma.transaction.findMany({
      where: filter,
      include: { user: { select: accountSelect } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    res.json({
      transactions: transactions.map((transaction) => ({
        ...transaction,
        amount: transaction.amountCents / 100,
      })),
    });
  });
  router.get("/transfers", async (_req, res) => {
    const transfers = await prisma.balanceTransfer.findMany({
      include: {
        fromUser: { select: accountSelect },
        toUser: { select: accountSelect },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    res.json({ transfers: transfers.map(transferJson) });
  });
  router.post("/transfers", financial, async (req, res) => {
    const body = requestSchema
      .extend({ fromUserId: z.string().min(1), toUserId: z.string().min(1) })
      .parse(req.body);
    const actor = req.auth!.user.id,
      amount = toCents(body.amount);
    if (body.fromUserId === body.toUserId)
      throw new HttpError(400, "Choose two different accounts.");
    if ([body.fromUserId, body.toUserId].includes(actor))
      throw new HttpError(
        403,
        "You cannot manage transfers involving your own administrator account.",
      );
    const id = `transfer:${body.idempotencyKey}`;
    const transfer = await serializable(async (tx) => {
      await transferAccount(tx, body.fromUserId);
      await transferAccount(tx, body.toUserId);
      await assertBalance(tx, body.fromUserId, amount);
      const created = await tx.balanceTransfer.create({
        data: {
          id,
          fromUserId: body.fromUserId,
          toUserId: body.toUserId,
          amountCents: amount,
          note: body.note,
          createdById: actor,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: body.fromUserId,
          amountCents: -amount,
          kind: "TRANSFER_RESERVE",
          referenceId: id,
        },
      });
      await tx.transaction.create({
        data: {
          id: `${id}:out`,
          userId: body.fromUserId,
          type: "TRANSFER",
          amountCents: amount,
          direction: "DEBIT",
          asset: "USD",
          network: "Internal transfer",
          note: body.note,
        },
      });
      await audit(
        tx,
        actor,
        "TRANSFER_CREATED",
        id,
        {
          fromUserId: body.fromUserId,
          toUserId: body.toUserId,
          amountCents: amount,
          note: body.note,
        },
        req.ip,
      );
      await notify(
        tx,
        body.fromUserId,
        "Transfer awaiting review",
        "Funds have been reserved for an internal account transfer. The recipient is credited only after approval.",
      );
      return created;
    });
    res
      .status(201)
      .json({
        transfer: transferJson(transfer),
        message: "Transfer queued for review; funds reserved.",
      });
  });
  router.post("/transfers/:id/review", financial, async (req, res) => {
    const body = z
      .object({
        action: z.enum(["approve", "reject"]),
        note: z.string().trim().min(15).max(1000),
      })
      .parse(req.body);
    const actor = req.auth!.user.id,
      id = String(req.params.id);
    const transfer = await serializable(async (tx) => {
      const current = await tx.balanceTransfer.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Transfer not found.");
      if (current.status !== "PENDING")
        throw new HttpError(409, "This transfer has already been reviewed.");
      if ([current.fromUserId, current.toUserId].includes(actor))
        throw new HttpError(
          403,
          "You cannot review a transfer involving your own administrator account.",
        );
      const approve = body.action === "approve";
      if (approve) {
        await transferAccount(tx, current.fromUserId);
        await transferAccount(tx, current.toUserId);
      }
      const reviewed = await tx.balanceTransfer.update({
        where: { id },
        data: {
          status: approve ? "SETTLED" : "REJECTED",
          reviewedById: actor,
          reviewedAt: new Date(),
          reviewNote: body.note,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: approve ? current.toUserId : current.fromUserId,
          amountCents: current.amountCents,
          kind: approve ? "TRANSFER_IN" : "TRANSFER_REFUND",
          referenceId: id,
        },
      });
      await tx.transaction.update({
        where: { id: `${id}:out` },
        data: {
          status: reviewed.status,
          reviewedById: actor,
          reviewedAt: reviewed.reviewedAt,
        },
      });
      if (approve)
        await tx.transaction.create({
          data: {
            id: `${id}:in`,
            userId: current.toUserId,
            type: "TRANSFER",
            amountCents: current.amountCents,
            direction: "CREDIT",
            status: "SETTLED",
            asset: "USD",
            network: "Internal transfer",
            note: current.note,
            reviewedById: actor,
            reviewedAt: reviewed.reviewedAt,
          },
        });
      await audit(
        tx,
        actor,
        approve ? "TRANSFER_APPROVED" : "TRANSFER_REJECTED",
        id,
        { note: body.note },
        req.ip,
      );
      await notify(
        tx,
        current.fromUserId,
        approve ? "Transfer completed" : "Transfer declined",
        approve
          ? "Your internal account transfer has been approved."
          : "The transfer was declined and reserved funds were restored to your available balance.",
      );
      if (approve)
        await notify(
          tx,
          current.toUserId,
          "Transfer received",
          "An approved internal account transfer has been credited to your available balance.",
        );
      return reviewed;
    });
    res.json({
      transfer: transferJson(transfer),
      message:
        body.action === "approve"
          ? "Transfer approved and credited."
          : "Transfer declined and funds restored.",
    });
  });
  return router;
}
