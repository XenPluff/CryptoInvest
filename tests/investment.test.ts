import { describe, expect, it } from "vitest";
import {
  calculateAccrualCents,
  calculateInvestmentGrowth,
  DAY_MS,
  PLAN_DEFINITIONS,
  projectPlan,
  timestampMs,
  usdToCents,
  type PlanType,
} from "../lib/investment";

const start = "2024-02-28T12:00:00.000Z";
const startMs = Date.parse(start);

describe("simple prorated target accrual", () => {
  it.each([
    ["starter", 100, 1750],
    ["elite", 2000, 42000],
    ["gold", 10000, 280000],
    ["platinum", 50000, 1750000],
    ["shareholder", 15000, 1800000],
  ] as const)(
    "%s reaches its stated full-term target without compounding",
    (planType, principalAmount, expectedEarnings) => {
      const result = projectPlan(principalAmount, planType);
      expect(result.earningsCents).toBe(expectedEarnings);
      expect(result.balanceCents).toBe(
        principalAmount * 100 + expectedEarnings,
      );
      expect(result.isComplete).toBe(true);
      expect(result.progress).toBe(1);
    },
  );

  it("clamps future starts to zero earnings and zero elapsed time", () => {
    const result = calculateInvestmentGrowth({
      planType: "starter",
      principalAmount: 100,
      startTimestamp: start,
      nowTimestamp: startMs - DAY_MS,
    });
    expect(result).toMatchObject({
      earningsCents: 0,
      balanceCents: 10000,
      earningsMicros: "0",
      balanceMicros: "100000000",
      elapsedMs: 0,
      remainingMs: 7 * DAY_MS,
      progress: 0,
      isComplete: false,
      isFuture: true,
    });
  });

  it("starts exactly at principal and never accrues before the first complete cent", () => {
    const input = {
      planType: "starter" as const,
      principalAmount: 100,
      startTimestamp: 0,
    };
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 0 }).earningsCents,
    ).toBe(0);
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 345_599 })
        .earningsCents,
    ).toBe(0);
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 345_600 })
        .earningsCents,
    ).toBe(1);
  });

  it("visibly advances a minimum Starter target each second without crediting a cent", () => {
    const input = {
      planType: "starter" as const,
      principalCents: 10000,
      startTimestamp: 0,
    };
    const first = calculateAccrualCents({ ...input, nowTimestamp: 1000 });
    const second = calculateAccrualCents({ ...input, nowTimestamp: 2000 });
    expect(first.earningsMicros).toBe("28");
    expect(first.balanceMicros).toBe("100000028");
    expect(second.earningsMicros).toBe("57");
    expect(second.balanceMicros).toBe("100000057");
    expect(first.earningsCents).toBe(0);
    expect(second.earningsCents).toBe(0);
    expect(second.balanceCents).toBe(10000);
  });

  it("floors display precision from the rational target before the first whole micro-dollar", () => {
    const input = {
      planType: "starter" as const,
      principalAmount: 100,
      startTimestamp: 0,
    };
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 34 }).earningsMicros,
    ).toBe("0");
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 35 }).earningsMicros,
    ).toBe("1");
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 100 }).earningsMicros,
    ).toBe("2");
  });

  it("keeps integer cents consistent with the floored micro-dollar target", () => {
    for (const planType of Object.keys(PLAN_DEFINITIONS) as PlanType[]) {
      const principalAmount = PLAN_DEFINITIONS[planType].minAmount + 0.01;
      for (const nowTimestamp of [
        -1, 0, 1000, 345599, 345600, DAY_MS, 366 * DAY_MS,
      ]) {
        const result = calculateInvestmentGrowth({
          planType,
          principalAmount,
          startTimestamp: 0,
          nowTimestamp,
        });
        expect(BigInt(result.earningsMicros) / 10000n).toBe(
          BigInt(result.earningsCents),
        );
        expect(BigInt(result.balanceMicros) / 10000n).toBe(
          BigInt(result.balanceCents),
        );
        expect(
          BigInt(result.balanceMicros) - BigInt(result.earningsMicros),
        ).toBe(BigInt(result.principalCents) * 10000n);
      }
    }
  });

  it("prorates to the millisecond, flooring cumulative cents instead of rounding up", () => {
    const result = calculateInvestmentGrowth({
      planType: "starter",
      principalAmount: 100.01,
      startTimestamp: 0,
      nowTimestamp: DAY_MS / 2,
    });
    expect(result.earningsCents).toBe(125);
    expect(result.progress).toBe(1 / 14);
    expect(result.balanceCents).toBe(10126);
  });

  it("caps at the final millisecond and remains fixed after maturity", () => {
    const input = {
      planType: "starter" as const,
      principalAmount: 100,
      startTimestamp: start,
    };
    const before = calculateInvestmentGrowth({
      ...input,
      nowTimestamp: startMs + 7 * DAY_MS - 1,
    });
    const mature = calculateInvestmentGrowth({
      ...input,
      nowTimestamp: startMs + 7 * DAY_MS,
    });
    const later = calculateInvestmentGrowth({
      ...input,
      nowTimestamp: startMs + 500 * DAY_MS,
    });
    expect(before.earningsCents).toBe(1749);
    expect(before.isComplete).toBe(false);
    expect(mature.earningsCents).toBe(1750);
    expect(before.earningsMicros).toBe("17499999");
    expect(mature.earningsMicros).toBe("17500000");
    expect(mature.balanceMicros).toBe("117500000");
    expect(mature).toEqual(later);
    expect(mature.remainingMs).toBe(0);
  });

  it("uses the immutable server snapshot rather than current published rate defaults", () => {
    const result = calculateInvestmentGrowth({
      planType: "starter",
      principalAmount: 100,
      startTimestamp: 0,
      nowTimestamp: 10 * DAY_MS,
      dailyRate: 0.0125,
      durationDays: 10,
    });
    expect(result.earningsCents).toBe(1250);
    expect(result.isComplete).toBe(true);
    expect(result.durationMs).toBe(10 * DAY_MS);
  });

  it("uses a fixed 365-day shareholder year when a term crosses leap day", () => {
    const result = calculateInvestmentGrowth({
      planType: "shareholder",
      principalAmount: 15000,
      startTimestamp: "2024-02-28T00:00:00Z",
      nowTimestamp: "2025-02-27T00:00:00Z",
    });
    expect(result.elapsedMs).toBe(365 * DAY_MS);
    expect(result.earningsCents).toBe(1800000);
    expect(result.isComplete).toBe(true);
  });

  it("caps six-decimal shareholder targets at one fixed year and keeps them unchanged", () => {
    const input = {
      planType: "shareholder" as const,
      principalAmount: 1_000_000,
      startTimestamp: start,
    };
    const mature = calculateInvestmentGrowth({
      ...input,
      nowTimestamp: startMs + 365 * DAY_MS,
    });
    const later = calculateInvestmentGrowth({
      ...input,
      nowTimestamp: startMs + 500 * DAY_MS,
    });
    expect(mature.balanceMicros).toBe("2200000000000");
    expect(mature.earningsMicros).toBe("1200000000000");
    expect(mature).toEqual(later);
  });

  it("preserves exact display strings when micro-dollar amounts exceed safe numeric integers", () => {
    const result = calculateAccrualCents({
      planType: "starter",
      principalCents: Number.MAX_SAFE_INTEGER,
      dailyRate: 0,
      startTimestamp: 0,
      nowTimestamp: DAY_MS,
    });
    expect(result.balanceMicros).toBe("90071992547409910000");
    expect(result.earningsMicros).toBe("0");
    expect(result.balanceCents).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("spreads 120% annual dividends evenly instead of treating each calendar month as 30 days", () => {
    const input = {
      planType: "shareholder" as const,
      principalAmount: 15000,
      startTimestamp: 0,
    };
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: (365 * DAY_MS) / 12 })
        .earningsCents,
    ).toBe(150000);
    expect(
      calculateInvestmentGrowth({ ...input, nowTimestamp: 30 * DAY_MS })
        .earningsCents,
    ).toBe(147945);
  });

  it("annualizes custom shareholder monthly rates consistently across custom durations", () => {
    const result = calculateInvestmentGrowth({
      planType: "shareholder",
      principalAmount: 1000,
      startTimestamp: 0,
      nowTimestamp: 180 * DAY_MS,
      monthlyRate: 0.05,
      durationDays: 180,
    });
    expect(result.earningsCents).toBe(29589);
    expect(result.earningsCents).toBe(result.maxEarningsCents);
  });

  it("accepts complete daily-rate snapshots for a newly created admin plan", () => {
    const result = calculateInvestmentGrowth({
      planType: "private-vault",
      principalAmount: 1000,
      dailyRate: 0.01,
      monthlyRate: 0,
      durationDays: 30,
      startTimestamp: 0,
      nowTimestamp: 30 * DAY_MS,
    });
    expect(result.earningsCents).toBe(30000);
    expect(result.isComplete).toBe(true);
  });

  it("accepts complete monthly-rate snapshots for custom admin plans", () => {
    const result = calculateInvestmentGrowth({
      planType: "monthly-income",
      principalAmount: 1000,
      dailyRate: 0,
      monthlyRate: 0.02,
      durationDays: 365,
      startTimestamp: 0,
      nowTimestamp: 365 * DAY_MS,
    });
    expect(result.earningsCents).toBe(24000);
  });

  it("uses the snapshot rate basis when an admin changes an existing plan basis", () => {
    const monthlyStarter = calculateInvestmentGrowth({
      planType: "starter",
      principalAmount: 1000,
      dailyRate: 0,
      monthlyRate: 0.02,
      durationDays: 365,
      startTimestamp: 0,
      nowTimestamp: 365 * DAY_MS,
    });
    expect(monthlyStarter.earningsCents).toBe(24000);
    const dailyShareholder = calculateInvestmentGrowth({
      planType: "shareholder",
      principalAmount: 1000,
      dailyRate: 0.01,
      monthlyRate: 0,
      durationDays: 7,
      startTimestamp: 0,
      nowTimestamp: 7 * DAY_MS,
    });
    expect(dailyShareholder.earningsCents).toBe(7000);
  });

  it("rejects conflicting daily and monthly snapshot rates", () => {
    expect(() =>
      calculateInvestmentGrowth({
        planType: "starter",
        principalAmount: 100,
        dailyRate: 0.01,
        monthlyRate: 0.02,
        startTimestamp: 0,
      }),
    ).toThrow("not both");
  });

  it("supports a zero-rate or zero-principal investment without NaN progress or returns", () => {
    expect(
      calculateInvestmentGrowth({
        planType: "starter",
        principalAmount: 0,
        startTimestamp: 0,
        nowTimestamp: DAY_MS,
      }).balanceCents,
    ).toBe(0);
    expect(
      calculateInvestmentGrowth({
        planType: "starter",
        principalAmount: 100,
        startTimestamp: 0,
        nowTimestamp: DAY_MS,
        dailyRate: 0,
      }).earningsCents,
    ).toBe(0);
  });

  it("does not over-credit rates susceptible to binary floating point error", () => {
    // 199999 * .07 = 13999.93 cents, which must never become 14000.
    const result = calculateAccrualCents({
      planType: "starter",
      principalCents: 199999,
      dailyRate: 0.07,
      startTimestamp: 0,
      nowTimestamp: DAY_MS,
    });
    expect(result.earningsCents).toBe(13999);
    const fractional = calculateAccrualCents({
      planType: "starter",
      principalCents: 10001,
      dailyRate: 0.000001,
      startTimestamp: 0,
      nowTimestamp: DAY_MS,
    });
    expect(fractional.earningsCents).toBe(0);
  });

  it("is monotonically nondecreasing and remains bounded across delayed updates", () => {
    const input = {
      planType: "gold" as const,
      principalAmount: 12345.67,
      startTimestamp: 0,
    };
    let previousEarnings = 0;
    for (const elapsed of [
      -DAY_MS,
      0,
      100,
      345600,
      DAY_MS,
      3 * DAY_MS + 123,
      7 * DAY_MS,
      100 * DAY_MS,
    ]) {
      const result = calculateInvestmentGrowth({
        ...input,
        nowTimestamp: elapsed,
      });
      expect(result.earningsCents).toBeGreaterThanOrEqual(previousEarnings);
      expect(result.earningsCents).toBeLessThanOrEqual(result.maxEarningsCents);
      previousEarnings = result.earningsCents;
    }
    expect(previousEarnings).toBe(345678);
  });
});

describe("money and input validation", () => {
  it.each([
    [0, 0],
    [0.01, 1],
    [0.29, 29],
    [10.01, 1001],
    [1999, 199900],
    [1e6, 100000000],
  ])("converts %s USD into exact %s cents", (amount, cents) => {
    expect(usdToCents(amount)).toBe(cents);
  });
  it.each([-1, Infinity, NaN, 0.001, 100.999, Number.MAX_SAFE_INTEGER])(
    "rejects invalid or non-cent principal %s",
    (amount) => {
      expect(() => usdToCents(amount)).toThrow(RangeError);
    },
  );
  it.each([-1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid integer principal cents %s",
    (principalCents) => {
      expect(() =>
        calculateAccrualCents({
          planType: "starter",
          principalCents,
          startTimestamp: 0,
          nowTimestamp: 0,
        }),
      ).toThrow(RangeError);
    },
  );
  it.each([-1, NaN, Infinity])("rejects invalid rate %s", (dailyRate) => {
    expect(() =>
      calculateInvestmentGrowth({
        planType: "starter",
        principalAmount: 100,
        startTimestamp: 0,
        dailyRate,
      }),
    ).toThrow(RangeError);
  });
  it.each([0, -1, 0.5, Infinity, 36501])(
    "rejects invalid duration %s",
    (durationDays) => {
      expect(() =>
        calculateInvestmentGrowth({
          planType: "starter",
          principalAmount: 100,
          startTimestamp: 0,
          durationDays,
        }),
      ).toThrow(RangeError);
    },
  );
  it("rejects unknown plans and balances that cannot be represented as safe integer cents", () => {
    expect(() =>
      calculateInvestmentGrowth({
        planType: "missing" as PlanType,
        principalAmount: 100,
        startTimestamp: 0,
      }),
    ).toThrow("Unknown");
    expect(() =>
      calculateAccrualCents({
        planType: "starter",
        principalCents: Number.MAX_SAFE_INTEGER,
        startTimestamp: 0,
      }),
    ).toThrow("supported range");
  });
  it("keeps canonical plan boundaries and durations explicit", () => {
    expect(PLAN_DEFINITIONS.starter.minAmount).toBe(100);
    expect(PLAN_DEFINITIONS.platinum.maxAmount).toBe(499999);
    expect(PLAN_DEFINITIONS.shareholder.maxAmount).toBe(1000000);
    expect(PLAN_DEFINITIONS.shareholder.durationDays).toBe(365);
  });
});

describe("timestamp interpretation", () => {
  it("treats explicit offsets and equivalent UTC timestamps identically", () => {
    expect(timestampMs("2024-02-29T05:30:00+05:30")).toBe(
      timestampMs("2024-02-29T00:00:00Z"),
    );
    expect(timestampMs(0)).toBe(0);
  });
  it.each([
    "not-a-date",
    "2024-01-01",
    "2024-01-01T00:00:00",
    "2023-02-29T00:00:00Z",
    "2024-02-30T00:00:00Z",
    "2024-13-01T00:00:00Z",
    "2024-01-01T24:00:00Z",
    "2024-01-01T00:60:00Z",
    "2024-01-01T00:00:60Z",
    "2024-01-01T00:00:00+25:00",
  ])("rejects ambiguous or invalid timestamp %s", (timestamp) => {
    expect(() => timestampMs(timestamp)).toThrow(RangeError);
  });
  it.each([NaN, Infinity, 1.1, 8.64e15 + 1])(
    "rejects invalid numeric timestamp %s",
    (timestamp) => {
      expect(() => timestampMs(timestamp)).toThrow(RangeError);
    },
  );
});
