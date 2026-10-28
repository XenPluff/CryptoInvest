import { Prisma } from "@prisma/client";
import { addCents } from "../lib/analytics";
import { automaticSettlementStatus } from "./investment-settlements";

/** Read posted proceeds and positions from the same database snapshot. */
export async function readInvestorPortfolio(tx: Prisma.TransactionClient, userId: string) {
  const [positions, proceeds] = await Promise.all([
    tx.investment.findMany({ where: { userId }, include: { verifiedSettlements: { select: { id: true, kind: true, verifiedAt: true, processedAt: true } } }, orderBy: [{ startTimestamp: "desc" }, { id: "desc" }] }),
    tx.ledgerEntry.groupBy({
      by: ["referenceId", "kind"],
      where: { userId, kind: { in: ["REALIZED_EARNINGS", "PRINCIPAL_RETURN"] } },
      _sum: { amountCents: true },
    }),
  ]);
  const earnings = new Map<string, number>(), returns = new Map<string, number>();
  let realizedEarningsCents = 0, principalReturnedCents = 0, activePrincipalCents = 0;
  const referenceMap = new Map(positions.flatMap(position => position.verifiedSettlements.map(record => [record.id, position.id] as const)));
  for (const row of proceeds) {
    const investmentId = referenceMap.get(row.referenceId) ?? row.referenceId;
    const cents = row._sum.amountCents ?? 0;
    if (row.kind === "REALIZED_EARNINGS") {
      earnings.set(investmentId, addCents(earnings.get(investmentId) ?? 0, cents));
      realizedEarningsCents = addCents(realizedEarningsCents, cents);
    } else {
      returns.set(investmentId, addCents(returns.get(investmentId) ?? 0, cents));
      principalReturnedCents = addCents(principalReturnedCents, cents);
    }
  }
  const investments = positions.map(position => {
    if (position.status === "ACTIVE") activePrincipalCents = addCents(activePrincipalCents, position.principalCents);
    const earnedCents = earnings.get(position.id) ?? 0;
    const returnedCents = returns.get(position.id) ?? 0;
    return { ...position, earnedCents, principalReturnedCents: returnedCents,
      principalAmount: position.principalCents / 100, earnedAmount: earnedCents / 100,
      principalReturned: returnedCents / 100 };
  });
  return {
    generatedAt: new Date().toISOString(),
    automaticSettlement: automaticSettlementStatus(),
    totalEarned: realizedEarningsCents / 100,
    summary: { activePrincipalCents, realizedEarningsCents, principalReturnedCents,
      activePositions: positions.filter(p => p.status === "ACTIVE").length,
      settledPositions: positions.filter(p => p.status === "SETTLED").length },
    investments,
  };
}
