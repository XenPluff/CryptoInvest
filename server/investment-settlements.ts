import { Prisma } from "@prisma/client";
import { config } from "./config";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { audit, serializable } from "./finance";
import { notify } from "./notifications";

export const SETTLEMENT_INTERVAL_MS = 15_000;
let lastCheckedAt: string | null = null;
export function automaticSettlementStatus() {
  return { enabled: config.automaticSettlementEnabled, intervalSeconds: SETTLEMENT_INTERVAL_MS / 1000,
    source: "administrator_verified_profit_records", lastCheckedAt };
}

interface SettlementAmounts {
  investmentId: string;
  kind?: "PROFIT" | "FINAL";
  verificationId?: string;
  principalReturnedCents: number;
  realizedEarningsCents: number;
  externalReference: string;
  note: string;
  actorId: string;
  ip?: string;
}

async function fundingAvailable(tx: Prisma.TransactionClient) {
  return config.fundingEnabled && (await tx.setting.findUnique({ where: { key: "fundingEnabled" } }))?.value !== "false";
}

export async function validateSettlement(tx: Prisma.TransactionClient, input: SettlementAmounts) {
  if (!(await fundingAvailable(tx))) throw new HttpError(503, "Funding is disabled.");
  const investment = await tx.investment.findUnique({ where: { id: input.investmentId } });
  if (!investment) throw new HttpError(404, "Investment not found.");
  if (investment.status !== "ACTIVE") throw new HttpError(409, "This investment is already settled.");
  if (investment.userId === input.actorId) throw new HttpError(403, "Administrators cannot settle their own investments.");
  if (input.kind !== "PROFIT" && Date.now() < investment.startTimestamp.getTime() + investment.durationDays * 86400000)
    throw new HttpError(409, "This investment has not reached maturity.");
  if (input.kind === "PROFIT" && input.realizedEarningsCents <= 0)
    throw new HttpError(400, "A verified profit credit must be greater than zero.");
  if (input.kind === "PROFIT" && input.principalReturnedCents !== 0)
    throw new HttpError(400, "Profit credits cannot return investment principal.");
  if (input.principalReturnedCents > investment.principalCents)
    throw new HttpError(400, "Principal returned cannot exceed the original principal. Record any genuine additional proceeds as realized earnings.");
  return investment;
}

/** Posts only supplied verified amounts, never the time-based target counter. */
export async function postInvestmentSettlement(tx: Prisma.TransactionClient, input: SettlementAmounts, automatic = false) {
  const investment = await validateSettlement(tx, input);
  const pending = await tx.verifiedInvestmentSettlement.findMany({ where: { investmentId: investment.id } });
  const proof = pending.find(record => record.id === input.verificationId);
  if (!automatic && pending.some(record => !record.processedAt))
    throw new HttpError(409, "Verified proceeds are already queued for automatic settlement.");
  if (automatic && (!proof || proof.processedAt))
    throw new HttpError(409, "This verified settlement has already been processed.");
  if (automatic && (proof!.kind !== (input.kind ?? "FINAL") || proof!.principalReturnedCents !== input.principalReturnedCents
    || proof!.realizedEarningsCents !== input.realizedEarningsCents || proof!.verifiedById !== input.actorId
    || proof!.externalReference !== input.externalReference || proof!.note !== input.note))
    throw new HttpError(400, "Verified settlement records cannot be overridden during posting.");
  const profitOnly = input.kind === "PROFIT";
  if (profitOnly && !automatic) throw new HttpError(400, "Profit credits require a verified settlement record.");
  const referenceId = profitOnly ? proof!.id : investment.id;
  await tx.ledgerEntry.createMany({ data: [
    ...(!profitOnly ? [{ userId: investment.userId, referenceId, kind: "PRINCIPAL_RETURN", amountCents: input.principalReturnedCents }] : []),
    { userId: investment.userId, referenceId, kind: "REALIZED_EARNINGS", amountCents: input.realizedEarningsCents },
  ] });
  const total = await tx.ledgerEntry.aggregate({ where: {
    userId: investment.userId, kind: "REALIZED_EARNINGS",
    referenceId: { in: [investment.id, ...pending.filter(record => record.kind === "PROFIT").map(record => record.id)] },
  }, _sum: { amountCents: true } });
  const settledAt = new Date();
  const updated = await tx.investment.update({ where: { id: investment.id }, data: {
    earnedCents: total._sum.amountCents ?? 0,
    ...(!profitOnly ? { status: "SETTLED" as const, settledAt } : {}),
  } });
  await tx.transaction.create({ data: {
    userId: investment.userId, type: "RETURN", amountCents: input.principalReturnedCents + input.realizedEarningsCents,
    status: "SETTLED", note: `${profitOnly ? "Verified profit" : "Reconciled settlement"} ${investment.id}; reference ${input.externalReference}`,
  } });
  if (automatic) await tx.verifiedInvestmentSettlement.update({ where: { id: proof!.id }, data: { processedAt: settledAt } });
  await audit(tx, input.actorId, profitOnly ? "INVESTMENT_PROFIT_CREDITED" : "INVESTMENT_SETTLED", investment.id, {
    principalReturnedCents: input.principalReturnedCents, realizedEarningsCents: input.realizedEarningsCents,
    externalReference: input.externalReference, note: input.note,
    automatic, verificationId: proof?.id ?? null,
  }, input.ip);
  await notify(tx, investment.userId, profitOnly ? "Verified profit credited" : "Investment settled",
    profitOnly ? "Verified investment income has been posted to your available balance. Your investment principal remains allocated."
      : "Reconciled proceeds have been posted to your available balance. Actual returns may differ from target estimates.");
  return updated;
}

export async function verifyInvestmentSettlement(input: SettlementAmounts) {
  if (!config.automaticSettlementEnabled) throw new HttpError(503, "Automatic settlement is disabled.");
  return serializable(async tx => {
    await validateSettlement(tx, input);
    const records = await tx.verifiedInvestmentSettlement.findMany({ where: { investmentId: input.investmentId } });
    if (records.some(record => record.externalReference === input.externalReference || record.kind === "FINAL"))
      throw new HttpError(409, "This evidence reference or final settlement is already recorded.");
    if (input.kind !== "PROFIT" && records.some(record => !record.processedAt))
      throw new HttpError(409, "Wait for queued profit credits before verifying the final settlement.");
    const verified = await tx.verifiedInvestmentSettlement.create({ data: {
      investmentId: input.investmentId, kind: input.kind ?? "FINAL", principalReturnedCents: input.principalReturnedCents,
      realizedEarningsCents: input.realizedEarningsCents, externalReference: input.externalReference,
      note: input.note, verifiedById: input.actorId,
    } });
    await audit(tx, input.actorId, "INVESTMENT_PROFITS_VERIFIED", input.investmentId, {
      verificationId: verified.id, kind: verified.kind, principalReturnedCents: input.principalReturnedCents,
      realizedEarningsCents: input.realizedEarningsCents, externalReference: input.externalReference, note: input.note,
    }, input.ip);
    return verified;
  });
}

/** Durable records and serializable posting make retries and multiple workers safe. */
export async function processVerifiedSettlements() {
  if (!config.automaticSettlementEnabled || !config.fundingEnabled) return { processed: 0, failed: 0 };
  if (!(await fundingAvailable(prisma))) { lastCheckedAt = new Date().toISOString(); return { processed: 0, failed: 0 }; }
  const operators = await prisma.user.findMany({ where: { role: "ADMIN", twoFactorEnabled: true }, select: { id: true } });
  const pending = await prisma.verifiedInvestmentSettlement.findMany({
    where: { processedAt: null, verifiedById: { in: operators.map(operator => operator.id) }, investment: { status: "ACTIVE" } },
    orderBy: [{ verifiedAt: "asc" }, { id: "asc" }], take: 50, select: { id: true },
  });
  let processed = 0, failed = 0;
  for (const { id } of pending) {
    try {
      const posted = await serializable(async tx => {
        if (!(await fundingAvailable(tx))) return false;
        const verified = await tx.verifiedInvestmentSettlement.findUnique({ where: { id }, include: { investment: true } });
        if (!verified || verified.processedAt || verified.investment.status !== "ACTIVE") return false;
        const operator = await tx.user.findUnique({ where: { id: verified.verifiedById }, select: { role: true, twoFactorEnabled: true } });
        if (operator?.role !== "ADMIN" || !operator.twoFactorEnabled) return false;
        await postInvestmentSettlement(tx, {
          investmentId: verified.investmentId, kind: verified.kind as "PROFIT" | "FINAL", verificationId: verified.id, principalReturnedCents: verified.principalReturnedCents,
          realizedEarningsCents: verified.realizedEarningsCents, externalReference: verified.externalReference,
          note: verified.note, actorId: verified.verifiedById,
        }, true);
        return true;
      });
      if (posted) processed++;
    } catch { failed++; }
  }
  lastCheckedAt = new Date().toISOString();
  return { processed, failed };
}

export function startSettlementWorker() {
  if (!config.automaticSettlementEnabled) return () => {};
  let running = false, stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      const result = await processVerifiedSettlements();
      if (result.failed) console.error("A verified settlement could not be posted; it remains queued for retry.");
    } catch { console.error("Automatic settlement check failed; verified records remain queued for retry."); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), SETTLEMENT_INTERVAL_MS); timer.unref();
  return () => { stopped = true; clearInterval(timer); };
}
