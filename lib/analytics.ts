/** All account analytics are denominated in integer USD cents. */
export interface LedgerObservation {
  id: string;
  amountCents: number;
  kind: string;
  referenceId: string;
  createdAt: Date | string;
}

export interface InvestmentObservation {
  id: string;
  planId: string;
  planName: string;
  principalCents: number;
  status: "ACTIVE" | "SETTLED";
  startTimestamp: Date | string;
  settledAt: Date | string | null;
}

export interface BalanceObservation {
  at: string;
  balanceCents: number;
  entries: number;
}
export interface AllocationObservation {
  planId: string;
  planName: string;
  principalCents: number;
  positions: number;
}
export interface PortfolioAnalyticsResponse {
  currency: "USD";
  generatedAt: string;
  summary: {
    availableBalanceCents: number;
    activePrincipalCents: number;
    realizedEarningsCents: number;
    referralCommissionsCents: number;
    principalReturnedCents: number;
    activePositions: number;
    settledPositions: number;
    ledgerEntries: number;
  };
  history: BalanceObservation[];
  allocation: AllocationObservation[];
  settlements: {
    id: string;
    planName: string;
    at: string;
    principalCents: number;
    returnedCents: number;
    earningsCents: number;
  }[];
}

export function addCents(left: number, right: number): number {
  const sum = left + right;
  if (![left, right, sum].every(Number.isSafeInteger))
    throw new RangeError("Analytics exceeds the supported integer-cent range.");
  return sum;
}

function instant(value: Date | string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new RangeError("Invalid analytics timestamp.");
  return date.toISOString();
}

export function balanceHistory(
  ledger: readonly LedgerObservation[],
): BalanceObservation[] {
  const ordered = [...ledger].sort(
    (a, b) =>
      instant(a.createdAt).localeCompare(instant(b.createdAt)) ||
      a.id.localeCompare(b.id),
  );
  const history: BalanceObservation[] = [];
  let balance = 0;
  for (const entry of ordered) {
    balance = addCents(balance, entry.amountCents);
    const at = instant(entry.createdAt);
    const last = history.at(-1);
    if (last?.at === at) {
      last.balanceCents = balance;
      last.entries += 1;
    } else history.push({ at, balanceCents: balance, entries: 1 });
  }
  return history;
}

export function portfolioAnalytics(
  ledger: readonly LedgerObservation[],
  investments: readonly InvestmentObservation[],
  generatedAt: Date = new Date(),
): PortfolioAnalyticsResponse {
  const history = balanceHistory(ledger);
  const byKind = new Map<string, number>();
  const byReference = new Map<string, Map<string, number>>();
  for (const entry of ledger) {
    byKind.set(
      entry.kind,
      addCents(byKind.get(entry.kind) ?? 0, entry.amountCents),
    );
    const reference =
      byReference.get(entry.referenceId) ?? new Map<string, number>();
    reference.set(
      entry.kind,
      addCents(reference.get(entry.kind) ?? 0, entry.amountCents),
    );
    byReference.set(entry.referenceId, reference);
  }
  const byPlan = new Map<string, AllocationObservation>();
  let activePrincipalCents = 0;
  let activePositions = 0;
  const settlements: PortfolioAnalyticsResponse["settlements"] = [];
  for (const investment of investments) {
    addCents(0, investment.principalCents);
    if (investment.status === "ACTIVE") {
      activePositions += 1;
      activePrincipalCents = addCents(
        activePrincipalCents,
        investment.principalCents,
      );
      const allocation = byPlan.get(investment.planId) ?? {
        planId: investment.planId,
        planName: investment.planName,
        principalCents: 0,
        positions: 0,
      };
      allocation.principalCents = addCents(
        allocation.principalCents,
        investment.principalCents,
      );
      allocation.positions += 1;
      byPlan.set(investment.planId, allocation);
    } else if (investment.settledAt) {
      const entries = byReference.get(investment.id);
      settlements.push({
        id: investment.id,
        planName: investment.planName,
        at: instant(investment.settledAt),
        principalCents: investment.principalCents,
        returnedCents: entries?.get("PRINCIPAL_RETURN") ?? 0,
        earningsCents: entries?.get("REALIZED_EARNINGS") ?? 0,
      });
    }
  }
  return {
    currency: "USD",
    generatedAt: instant(generatedAt),
    summary: {
      availableBalanceCents: history.at(-1)?.balanceCents ?? 0,
      activePrincipalCents,
      realizedEarningsCents: byKind.get("REALIZED_EARNINGS") ?? 0,
      referralCommissionsCents: byKind.get("REFERRAL_COMMISSION") ?? 0,
      principalReturnedCents: byKind.get("PRINCIPAL_RETURN") ?? 0,
      activePositions,
      settledPositions: investments.filter((i) => i.status === "SETTLED")
        .length,
      ledgerEntries: ledger.length,
    },
    history,
    allocation: [...byPlan.values()].sort(
      (a, b) =>
        b.principalCents - a.principalCents || a.planId.localeCompare(b.planId),
    ),
    settlements: settlements.sort(
      (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
    ),
  };
}

export interface AdminAnalyticsObservation {
  users: { createdAt: Date | string }[];
  ledger: LedgerObservation[];
  investments: InvestmentObservation[];
  withdrawals: { amountCents: number; reviewedAt: Date | string | null }[];
  pendingDeposits: number;
  pendingWithdrawals: number;
}

export interface PlatformObservation {
  at: string;
  investors: number;
  verifiedDepositsCents: number;
  paidWithdrawalsCents: number;
  realizedEarningsCents: number;
}
export interface AdminAnalyticsResponse {
  currency: "USD";
  generatedAt: string;
  summary: {
    registeredInvestors: number;
    verifiedDepositsCents: number;
    paidWithdrawalsCents: number;
    netFundingCents: number;
    investorEarningsCents: number;
    returnedPrincipalCents: number;
    activePrincipalCents: number;
    activePositions: number;
    settledPositions: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  };
  history: PlatformObservation[];
  allocation: AllocationObservation[];
}

export function platformAnalytics(
  input: AdminAnalyticsObservation,
  generatedAt: Date = new Date(),
): AdminAnalyticsResponse {
  type Event = {
    at: string;
    investors?: number;
    verifiedDepositsCents?: number;
    paidWithdrawalsCents?: number;
    realizedEarningsCents?: number;
  };
  const events: Event[] = input.users.map((user) => ({
    at: instant(user.createdAt),
    investors: 1,
  }));
  for (const entry of input.ledger) {
    if (entry.kind === "VERIFIED_DEPOSIT")
      events.push({
        at: instant(entry.createdAt),
        verifiedDepositsCents: entry.amountCents,
      });
    if (entry.kind === "REALIZED_EARNINGS")
      events.push({
        at: instant(entry.createdAt),
        realizedEarningsCents: entry.amountCents,
      });
  }
  for (const withdrawal of input.withdrawals) {
    // A paid record without its actual review timestamp is included in totals,
    // but is never assigned an invented historical payment date.
    if (withdrawal.reviewedAt)
      events.push({
        at: instant(withdrawal.reviewedAt),
        paidWithdrawalsCents: withdrawal.amountCents,
      });
  }
  events.sort((a, b) => a.at.localeCompare(b.at));
  let running: PlatformObservation = {
    at: "",
    investors: 0,
    verifiedDepositsCents: 0,
    paidWithdrawalsCents: 0,
    realizedEarningsCents: 0,
  };
  const history: PlatformObservation[] = [];
  for (const event of events) {
    running = {
      at: event.at,
      investors: running.investors + (event.investors ?? 0),
      verifiedDepositsCents: addCents(
        running.verifiedDepositsCents,
        event.verifiedDepositsCents ?? 0,
      ),
      paidWithdrawalsCents: addCents(
        running.paidWithdrawalsCents,
        event.paidWithdrawalsCents ?? 0,
      ),
      realizedEarningsCents: addCents(
        running.realizedEarningsCents,
        event.realizedEarningsCents ?? 0,
      ),
    };
    if (history.at(-1)?.at === event.at)
      history[history.length - 1] = { ...running };
    else history.push({ ...running });
  }
  const portfolio = portfolioAnalytics(
    input.ledger,
    input.investments,
    generatedAt,
  );
  const paidWithdrawalsCents = input.withdrawals.reduce(
    (sum, withdrawal) => addCents(sum, withdrawal.amountCents),
    0,
  );
  return {
    currency: "USD",
    generatedAt: instant(generatedAt),
    summary: {
      registeredInvestors: input.users.length,
      verifiedDepositsCents: running.verifiedDepositsCents,
      paidWithdrawalsCents,
      netFundingCents: addCents(
        running.verifiedDepositsCents,
        -paidWithdrawalsCents,
      ),
      investorEarningsCents: portfolio.summary.realizedEarningsCents,
      returnedPrincipalCents: portfolio.summary.principalReturnedCents,
      activePrincipalCents: portfolio.summary.activePrincipalCents,
      activePositions: portfolio.summary.activePositions,
      settledPositions: portfolio.summary.settledPositions,
      pendingDeposits: input.pendingDeposits,
      pendingWithdrawals: input.pendingWithdrawals,
    },
    history,
    allocation: portfolio.allocation,
  };
}
