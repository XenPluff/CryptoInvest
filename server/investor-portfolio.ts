import { Prisma } from "@prisma/client";
import { addCents } from "../lib/analytics";

/** Read posted proceeds and positions from the same database snapshot. */
export async function readInvestorPortfolio(tx: Prisma.TransactionClient, userId: string) {
  const [positions, proceeds] = await Promise.all([
    tx.investment.findMany({ where: { userId }, orderBy: [{ startTimestamp: "desc" }, { id: "desc" }] }),
    tx.ledgerEntry.groupBy({
      by: ["referenceId", "kind"],
      where: { userId, kind: { in: ["REALIZED_EARNINGS", "PRINCIPAL_RETURN"] } },
      _sum: { amountCents: true },
    }),
  ]);
  const earnings = new Map<string, number>(), returns = new Map<string, number>();
  let realizedEarningsCents = 0, principalReturnedCents = 0, activePrincipalCents = 0;
  for (const row of proceeds) {
    const cents = row._sum.amountCents ?? 0;
    if (row.kind === "REALIZED_EARNINGS") {
      earnings.set(row.referenceId, cents);
      realizedEarningsCents = addCents(realizedEarningsCents, cents);
    } else {
      returns.set(row.referenceId, cents);
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
    totalEarned: realizedEarningsCents / 100,
    summary: { activePrincipalCents, realizedEarningsCents, principalReturnedCents,
      activePositions: positions.filter(p => p.status === "ACTIVE").length,
      settledPositions: positions.filter(p => p.status === "SETTLED").length },
    investments,
  };
}
