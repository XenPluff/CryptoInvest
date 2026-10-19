import { describe, expect, it } from "vitest";
import {
  addCents,
  balanceHistory,
  platformAnalytics,
  portfolioAnalytics,
  type InvestmentObservation,
  type LedgerObservation,
} from "../lib/analytics";

const generatedAt = new Date("2026-06-15T12:00:00.000Z");
const at = (day: number) =>
  `2026-06-${String(day).padStart(2, "0")}T12:00:00.000Z`;
const entry = (
  id: string,
  day: number,
  amountCents: number,
  kind = "VERIFIED_DEPOSIT",
  referenceId = id,
): LedgerObservation => ({
  id,
  createdAt: at(day),
  amountCents,
  kind,
  referenceId,
});
const investment = (
  overrides: Partial<InvestmentObservation> = {},
): InvestmentObservation => ({
  id: "position-1",
  planId: "plan-1",
  planName: "Original plan name",
  principalCents: 10001,
  status: "ACTIVE",
  startTimestamp: at(2),
  settledAt: null,
  ...overrides,
});

describe("immutable ledger balance history", () => {
  it("orders actual posting timestamps, groups simultaneous postings, and preserves integer cents", () => {
    const ledger = [
      entry("withdrawal", 3, -2001, "WITHDRAWAL_RESERVE"),
      entry("deposit", 1, 10001),
      entry("allocation", 2, -3000, "INVESTMENT_PRINCIPAL"),
      entry("earnings", 3, 101, "REALIZED_EARNINGS"),
    ];
    const before = structuredClone(ledger);
    expect(balanceHistory(ledger)).toEqual([
      { at: at(1), balanceCents: 10001, entries: 1 },
      { at: at(2), balanceCents: 7001, entries: 1 },
      { at: at(3), balanceCents: 5101, entries: 2 },
    ]);
    expect(ledger).toEqual(before);
  });

  it("never inserts a synthetic initial, daily, current, or future observation", () => {
    expect(balanceHistory([entry("once", 5, 29)])).toEqual([
      { at: at(5), balanceCents: 29, entries: 1 },
    ]);
    expect(balanceHistory([])).toEqual([]);
  });

  it("retains a negative balance if it exists in the record instead of hiding it", () => {
    expect(
      balanceHistory([entry("correction", 1, -1, "ADJUSTMENT")])[0]
        .balanceCents,
    ).toBe(-1);
  });

  it("rejects unsafe sums and noninteger cent values", () => {
    expect(() =>
      balanceHistory([
        entry("a", 1, Number.MAX_SAFE_INTEGER),
        entry("b", 2, 1),
      ]),
    ).toThrow(RangeError);
    expect(() => balanceHistory([entry("a", 1, 0.5)])).toThrow(RangeError);
    expect(() => addCents(Infinity, 0)).toThrow(RangeError);
  });

  it("rejects invalid observation timestamps", () => {
    expect(() =>
      balanceHistory([{ ...entry("a", 1, 1), createdAt: "not-a-date" }]),
    ).toThrow("timestamp");
  });
});

describe("portfolio metrics", () => {
  it("returns honest empty counts and amounts for a new account", () => {
    const result = portfolioAnalytics([], [], generatedAt);
    expect(result).toEqual({
      currency: "USD",
      generatedAt: generatedAt.toISOString(),
      history: [],
      allocation: [],
      settlements: [],
      summary: {
        availableBalanceCents: 0,
        activePrincipalCents: 0,
        realizedEarningsCents: 0,
        referralCommissionsCents: 0,
        principalReturnedCents: 0,
        activePositions: 0,
        settledPositions: 0,
        ledgerEntries: 0,
      },
    });
  });

  it("allocates active principal by immutable plan snapshot, excluding settled positions", () => {
    const result = portfolioAnalytics(
      [],
      [
        investment(),
        investment({ id: "position-2", principalCents: 19999 }),
        investment({
          id: "position-3",
          planId: "plan-2",
          planName: "Another plan",
          principalCents: 40001,
        }),
        investment({
          id: "settled",
          principalCents: 90000,
          status: "SETTLED",
          settledAt: at(4),
        }),
      ],
      generatedAt,
    );
    expect(result.summary).toMatchObject({
      activePrincipalCents: 70001,
      activePositions: 3,
      settledPositions: 1,
    });
    expect(result.allocation).toEqual([
      {
        planId: "plan-2",
        planName: "Another plan",
        principalCents: 40001,
        positions: 1,
      },
      {
        planId: "plan-1",
        planName: "Original plan name",
        principalCents: 30000,
        positions: 2,
      },
    ]);
    expect(
      result.allocation.reduce((sum, plan) => sum + plan.principalCents, 0),
    ).toBe(result.summary.activePrincipalCents);
  });

  it("reads earnings and returned principal from actual ledger credits, including principal loss", () => {
    const ledger = [
      entry("deposit", 1, 10001),
      entry("principal", 2, -10001, "INVESTMENT_PRINCIPAL", "position-1"),
      entry("returned", 4, 8000, "PRINCIPAL_RETURN", "position-1"),
      entry("earnings", 4, 101, "REALIZED_EARNINGS", "position-1"),
      entry("referral", 5, 29, "REFERRAL_COMMISSION"),
    ];
    const result = portfolioAnalytics(
      ledger,
      [investment({ status: "SETTLED", settledAt: at(4) })],
      generatedAt,
    );
    expect(result.summary).toMatchObject({
      availableBalanceCents: 8130,
      realizedEarningsCents: 101,
      referralCommissionsCents: 29,
      principalReturnedCents: 8000,
      activePrincipalCents: 0,
    });
    expect(result.settlements).toEqual([
      {
        id: "position-1",
        planName: "Original plan name",
        at: at(4),
        principalCents: 10001,
        returnedCents: 8000,
        earningsCents: 101,
      },
    ]);
  });

  it("does not manufacture earnings from active positions or match another settlement reference", () => {
    const result = portfolioAnalytics(
      [entry("other-return", 4, 500, "REALIZED_EARNINGS", "other-position")],
      [
        investment(),
        investment({ id: "settled", status: "SETTLED", settledAt: at(5) }),
      ],
      generatedAt,
    );
    expect(result.settlements[0]).toMatchObject({
      returnedCents: 0,
      earningsCents: 0,
    });
    expect(result.summary.realizedEarningsCents).toBe(500);
  });

  it("rejects unsafe cumulative active principal", () => {
    expect(() =>
      portfolioAnalytics(
        [],
        [
          investment({ principalCents: Number.MAX_SAFE_INTEGER }),
          investment({ id: "next", principalCents: 1 }),
        ],
      ),
    ).toThrow(RangeError);
  });
});

describe("actual platform analytics", () => {
  it("separates investor funding, payouts, and settled earnings without inventing revenue", () => {
    const result = platformAnalytics(
      {
        users: [{ createdAt: at(1) }, { createdAt: at(3) }],
        ledger: [
          entry("deposit-a", 2, 10001),
          entry("deposit-b", 3, 19999),
          entry("settled", 4, 123, "REALIZED_EARNINGS"),
          entry("returned", 4, 9000, "PRINCIPAL_RETURN"),
          entry("reserve", 3, -5001, "WITHDRAWAL_RESERVE"),
        ],
        investments: [investment()],
        withdrawals: [{ amountCents: 5001, reviewedAt: at(5) }],
        pendingDeposits: 2,
        pendingWithdrawals: 1,
      },
      generatedAt,
    );
    expect(result.summary).toMatchObject({
      registeredInvestors: 2,
      verifiedDepositsCents: 30000,
      paidWithdrawalsCents: 5001,
      netFundingCents: 24999,
      investorEarningsCents: 123,
      returnedPrincipalCents: 9000,
      activePrincipalCents: 10001,
      pendingDeposits: 2,
      pendingWithdrawals: 1,
    });
    expect(result.summary).not.toHaveProperty("revenue");
    expect(result.history.at(-1)).toEqual({
      at: at(5),
      investors: 2,
      verifiedDepositsCents: 30000,
      paidWithdrawalsCents: 5001,
      realizedEarningsCents: 123,
    });
    expect(result.history.map((point) => point.at)).toEqual([
      at(1),
      at(2),
      at(3),
      at(4),
      at(5),
    ]);
  });

  it("counts a paid withdrawal with missing timestamp in totals without assigning a fake history date", () => {
    const result = platformAnalytics(
      {
        users: [],
        ledger: [],
        investments: [],
        withdrawals: [{ amountCents: 101, reviewedAt: null }],
        pendingDeposits: 0,
        pendingWithdrawals: 0,
      },
      generatedAt,
    );
    expect(result.summary.paidWithdrawalsCents).toBe(101);
    expect(result.summary.netFundingCents).toBe(-101);
    expect(result.history).toEqual([]);
  });

  it("returns an empty platform with no sample data or future date points", () => {
    const result = platformAnalytics(
      {
        users: [],
        ledger: [],
        investments: [],
        withdrawals: [],
        pendingDeposits: 0,
        pendingWithdrawals: 0,
      },
      generatedAt,
    );
    expect(Object.values(result.summary).every((value) => value === 0)).toBe(
      true,
    );
    expect(result.history).toEqual([]);
  });

  it("uses integer cents across many small credits", () => {
    const ledger = Array.from({ length: 1000 }, (_, index) =>
      entry(String(index), 1, 29),
    );
    const result = platformAnalytics(
      {
        users: [],
        ledger,
        investments: [],
        withdrawals: [],
        pendingDeposits: 0,
        pendingWithdrawals: 0,
      },
      generatedAt,
    );
    expect(result.summary.verifiedDepositsCents).toBe(29000);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].verifiedDepositsCents).toBe(29000);
  });
});
