/**
 * Illustrative, simple prorated targets. These functions never settle or move money.
 * Ledger-facing outputs use integer cents; fractional accrued cents are discarded.
 * Micro-dollar strings provide illustrative display precision only, never credit.
 * A shareholder year is exactly 365 days, including when it crosses a leap day.
 */
export const DAY_MS = 86_400_000;
export const YEAR_DAYS = 365;
export type PlanType =
  | "starter"
  | "elite"
  | "gold"
  | "platinum"
  | "shareholder";
export interface PlanDefinition {
  name: string;
  minAmount: number;
  maxAmount: number;
  durationDays: number;
  dailyRate: number;
  monthlyRate: number;
}
export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
  starter: {
    name: "Starter",
    minAmount: 100,
    maxAmount: 1_999,
    durationDays: 7,
    dailyRate: 0.025,
    monthlyRate: 0,
  },
  elite: {
    name: "Elite",
    minAmount: 2_000,
    maxAmount: 9_999,
    durationDays: 7,
    dailyRate: 0.03,
    monthlyRate: 0,
  },
  gold: {
    name: "Gold",
    minAmount: 10_000,
    maxAmount: 49_999,
    durationDays: 7,
    dailyRate: 0.04,
    monthlyRate: 0,
  },
  platinum: {
    name: "Platinum",
    minAmount: 50_000,
    maxAmount: 499_999,
    durationDays: 7,
    dailyRate: 0.05,
    monthlyRate: 0,
  },
  shareholder: {
    name: "Shareholder",
    minAmount: 15_000,
    maxAmount: 1_000_000,
    durationDays: YEAR_DAYS,
    dailyRate: 0,
    monthlyRate: 0.1,
  },
};
export type InvestmentTimestamp = string | number;
export interface AccrualInput {
  planType: PlanType | (string & {});
  principalCents: number;
  startTimestamp: InvestmentTimestamp;
  nowTimestamp?: InvestmentTimestamp;
  /** Decimal fraction: .025 means 2.5%. Use the investment's immutable snapshot. */
  dailyRate?: number;
  /** Decimal fraction: .10 means 10%. Annualized as monthlyRate * 12 / 365 days. */
  monthlyRate?: number;
  durationDays?: number;
}
export interface InvestmentGrowthInput
  extends Omit<AccrualInput, "principalCents"> {
  principalAmount: number;
}
export interface InvestmentGrowth {
  principalCents: number;
  earningsCents: number;
  balanceCents: number;
  /** Exact floored USD × 1,000,000, for illustrative animation only. */
  earningsMicros: string;
  /** Includes principal; additional decimal places are not settled funds. */
  balanceMicros: string;
  maxEarningsCents: number;
  maxBalanceCents: number;
  elapsedMs: number;
  durationMs: number;
  remainingMs: number;
  progress: number;
  isComplete: boolean;
  isFuture: boolean;
}

function decimalFraction(
  value: number,
  label: string,
): { numerator: bigint; denominator: bigint } {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${label} must be a finite nonnegative number.`);
  const [mantissa, exponentText] = value.toString().toLowerCase().split("e");
  const exponent = Number(exponentText || 0);
  const [whole, decimals = ""] = mantissa.split(".");
  const power = decimals.length - exponent;
  const digits = BigInt(`${whole}${decimals}`);
  return power >= 0
    ? { numerator: digits, denominator: 10n ** BigInt(power) }
    : { numerator: digits * 10n ** BigInt(-power), denominator: 1n };
}

/** Reject fractions of a cent instead of silently rounding a user's principal up. */
export function usdToCents(amount: number): number {
  const { numerator, denominator } = decimalFraction(
    amount,
    "Principal amount",
  );
  const scaled = numerator * 100n;
  if (scaled % denominator !== 0n)
    throw new RangeError(
      "Principal amount must have at most two decimal places.",
    );
  const cents = scaled / denominator;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Principal amount exceeds the supported range.");
  return Number(cents);
}

/** ISO timestamps require an explicit timezone; numeric timestamps are milliseconds. */
export function timestampMs(value: InvestmentTimestamp): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Math.abs(value) > 8.64e15)
      throw new RangeError("Timestamp must be valid integer milliseconds.");
    return value;
  }
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!parts)
    throw new RangeError(
      "Timestamp must be an ISO date and time with a timezone.",
    );
  const [, year, month, day, hour, minute, second, , zone] = parts;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    date.getUTCMonth() !== Number(month) - 1 ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (zone !== "Z" &&
      (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))
  ) {
    throw new RangeError("Timestamp contains an invalid date or time.");
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new RangeError("Timestamp is invalid.");
  return parsed;
}

export interface InvestmentTerms {
  name: string;
  dailyRate: number;
  monthlyRate: number;
  durationDays: number;
  isMonthly: boolean;
}

/** New admin-created slugs require explicit terms; no rate is guessed. */
export function resolveInvestmentTerms(
  input: Pick<
    AccrualInput,
    "planType" | "dailyRate" | "monthlyRate" | "durationDays"
  >,
): InvestmentTerms {
  const defaults = Object.hasOwn(PLAN_DEFINITIONS, input.planType)
    ? PLAN_DEFINITIONS[input.planType as PlanType]
    : undefined;
  if (
    !defaults &&
    (input.dailyRate === undefined ||
      input.monthlyRate === undefined ||
      input.durationDays === undefined)
  )
    throw new RangeError(
      "Unknown investment plan requires a complete rate and duration snapshot.",
    );
  const durationDays = input.durationDays ?? defaults!.durationDays;
  if (
    !Number.isSafeInteger(durationDays) ||
    durationDays <= 0 ||
    durationDays > 36_500
  )
    throw new RangeError("Duration must be between 1 and 36500 whole days.");
  const dailyRate = input.dailyRate ?? defaults!.dailyRate;
  const monthlyRate = input.monthlyRate ?? defaults!.monthlyRate;
  decimalFraction(dailyRate, "Daily rate");
  decimalFraction(monthlyRate, "Monthly rate");
  if (dailyRate > 0 && monthlyRate > 0)
    throw new RangeError("A plan must use a daily or monthly rate, not both.");
  return {
    name:
      defaults?.name ??
      input.planType
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    dailyRate,
    monthlyRate,
    durationDays,
    isMonthly:
      monthlyRate > 0 || (dailyRate === 0 && input.planType === "shareholder"),
  };
}

export function calculateAccrualCents(input: AccrualInput): InvestmentGrowth {
  const { durationDays, dailyRate, monthlyRate, isMonthly } =
    resolveInvestmentTerms(input);
  if (!Number.isSafeInteger(input.principalCents) || input.principalCents < 0)
    throw new RangeError("Principal must be nonnegative integer cents.");
  const startMs = timestampMs(input.startTimestamp);
  const nowMs = timestampMs(input.nowTimestamp ?? Date.now());
  const durationMs = durationDays * DAY_MS;
  const isFuture = nowMs < startMs;
  const elapsedMs = Math.min(durationMs, Math.max(0, nowMs - startMs));
  // Monthly targets use a fixed 365-day annualization, including custom plans.
  const rate = decimalFraction(isMonthly ? monthlyRate : dailyRate, "Rate");
  const rateNumerator = rate.numerator * (isMonthly ? 12n : 1n);
  const periodMs = isMonthly ? YEAR_DAYS * DAY_MS : DAY_MS;
  const denominator = rate.denominator * BigInt(periodMs);
  const principal = BigInt(input.principalCents);
  const earningsNumerator = principal * rateNumerator * BigInt(elapsedMs);
  const earnings = earningsNumerator / denominator;
  // Derive both precisions from the same rational target, never rounded cents.
  const earningsMicros = (earningsNumerator * 10_000n) / denominator;
  const maximum =
    (principal * rateNumerator * BigInt(durationMs)) / denominator;
  if (principal + maximum > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Projected balance exceeds the supported range.");
  return {
    principalCents: input.principalCents,
    earningsCents: Number(earnings),
    balanceCents: Number(principal + earnings),
    earningsMicros: earningsMicros.toString(),
    balanceMicros: (principal * 10_000n + earningsMicros).toString(),
    maxEarningsCents: Number(maximum),
    maxBalanceCents: Number(principal + maximum),
    elapsedMs,
    durationMs,
    remainingMs: durationMs - elapsedMs,
    progress: elapsedMs / durationMs,
    isComplete: elapsedMs === durationMs,
    isFuture,
  };
}
export function calculateInvestmentGrowth(
  input: InvestmentGrowthInput,
): InvestmentGrowth {
  return calculateAccrualCents({
    ...input,
    principalCents: usdToCents(input.principalAmount),
  });
}
export function projectPlan(
  principalAmount: number,
  planType: PlanType,
  elapsedDays?: number,
): InvestmentGrowth {
  const durationDays = PLAN_DEFINITIONS[planType].durationDays;
  const days = elapsedDays ?? durationDays;
  if (!Number.isFinite(days))
    throw new RangeError("Elapsed days must be finite.");
  return calculateInvestmentGrowth({
    planType,
    principalAmount,
    startTimestamp: 0,
    nowTimestamp: Math.round(days * DAY_MS),
  });
}
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
