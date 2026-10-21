"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  calculateInvestmentGrowth,
  DAY_MS,
  formatUsd,
  PLAN_DEFINITIONS,
  type PlanDefinition,
  type PlanType,
} from "@/lib/investment";
import styles from "./investment.module.css";

type CalculatorPlan = PlanDefinition & { slug: string; active?: boolean };
const referencePlans: CalculatorPlan[] = (
  Object.keys(PLAN_DEFINITIONS) as PlanType[]
).map((slug) => ({ ...PLAN_DEFINITIONS[slug], slug }));

export function InvestmentCalculator() {
  useDisplayLocale();
  const [plans, setPlans] = useState(referencePlans);
  const [selected, setSelected] = useState<string>("starter");
  const selectedRef = useRef("starter");
  const [amount, setAmount] = useState("1000");
  const [days, setDays] = useState(7);
  const [source, setSource] = useState<"loading" | "live" | "reference">(
    "loading",
  );
  const gradientId = useId().replace(/:/g, "");
  const plan = plans.find((item) => item.slug === selected) ?? plans[0];
  useEffect(() => {
    const controller = new AbortController();
    api<{ plans: CalculatorPlan[] }>("/plans", { signal: controller.signal })
      .then((result) => {
        const available = result.plans.filter(
          (item) =>
            item.active !== false &&
            Number.isFinite(item.minAmount) &&
            Number.isFinite(item.maxAmount) &&
            Number.isFinite(item.dailyRate) &&
            Number.isFinite(item.monthlyRate) &&
            Number.isInteger(item.durationDays),
        );
        if (!available.length) {
          setSource("reference");
          return;
        }
        setPlans(available);
        const initial =
          available.find((item) => item.slug === selectedRef.current) ??
          available[0];
        setSelected(initial.slug);
        setAmount((current) =>
          String(
            Math.max(
              initial.minAmount,
              Math.min(Number(current) || initial.minAmount, initial.maxAmount),
            ),
          ),
        );
        setDays((current) =>
          Math.max(1, Math.min(current, initial.durationDays)),
        );
        setSource("live");
      })
      .catch(() => {
        if (!controller.signal.aborted) setSource("reference");
      });
    return () => controller.abort();
  }, []);

  const result = useMemo(() => {
    const principal = Number(amount);
    if (!amount.trim() || !Number.isFinite(principal))
      return { error: "Enter an investment amount in USD." };
    if (principal < plan.minAmount || principal > plan.maxAmount)
      return {
        error: `Enter between ${formatUsd(plan.minAmount * 100)} and ${formatUsd(plan.maxAmount * 100)} for this plan.`,
      };
    try {
      return {
        growth: calculateInvestmentGrowth({
          planType: plan.slug,
          principalAmount: principal,
          startTimestamp: 0,
          nowTimestamp: days * DAY_MS,
          dailyRate: plan.dailyRate,
          monthlyRate: plan.monthlyRate,
          durationDays: plan.durationDays,
        }),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Check the investment amount.",
      };
    }
  }, [amount, days, plan]);

  const updatePlan = (slug: string) => {
    const next = plans.find((item) => item.slug === slug)!;
    selectedRef.current = slug;
    setSelected(slug);
    setAmount(
      String(
        Math.min(
          next.maxAmount,
          Math.max(next.minAmount, Number(amount) || next.minAmount),
        ),
      ),
    );
    setDays(next.durationDays);
  };
  const rate = plan.monthlyRate > 0 ? plan.monthlyRate : plan.dailyRate;
  const earningsPercent =
    result.growth && result.growth.principalCents
      ? (result.growth.earningsCents / result.growth.principalCents) * 100
      : 0;
  return <TranslatedContent>{(
    <section
      className={styles.calculator}
      aria-label="Illustrative investment calculator"
    >
      <div className={styles.calcHeading}>
        <div>
          <p className={styles.eyebrow}>THE POSSIBILITIES, IN PERSPECTIVE</p>
          <h2>Put your capital in motion.</h2>
        </div>
        <span>
          <SlidersHorizontal size={12} /> Investment calculator
        </span>
      </div>
      <div className={styles.calcBody}>
        <div className={styles.calcControls}>
          <div>
            <label className={styles.inputLabel} htmlFor={`${gradientId}-plan`}>
              Investment plan
            </label>
            <div className={styles.selectWrap}>
              <select
                id={`${gradientId}-plan`}
                value={plan.slug}
                onChange={(event) => updatePlan(event.target.value)}
              >
                {plans.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name} —{" "}
                    {Number(
                      (
                        (item.monthlyRate > 0
                          ? item.monthlyRate
                          : item.dailyRate) * 100
                      ).toFixed(4),
                    )}
                    % target / {item.monthlyRate > 0 ? "month" : "day"}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          <div>
            <label
              className={styles.inputLabel}
              htmlFor={`${gradientId}-amount`}
            >
              Your investment amount
            </label>
            <div className={styles.amountWrap}>
              <span aria-hidden="true">$</span>
              <input
                className={styles.amountInput}
                id={`${gradientId}-amount`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min={plan.minAmount}
                max={plan.maxAmount}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(result.error)}
                aria-describedby={`${gradientId}-amount-hint`}
              />
            </div>
            <p id={`${gradientId}-amount-hint`} className={styles.amountHint}>
              {formatUsd(plan.minAmount * 100)} –{" "}
              {formatUsd(plan.maxAmount * 100)} · USD
            </p>
          </div>
          <div>
            <label className={styles.dayLabel} htmlFor={`${gradientId}-days`}>
              <span>Time horizon</span>
              <strong>
                {days} {days === 1 ? "day" : "days"}
              </strong>
            </label>
            <input
              className={styles.daysInput}
              id={`${gradientId}-days`}
              type="range"
              min={1}
              max={plan.durationDays}
              step={1}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
            <div className={styles.rangeLabels}>
              <span>1 day</span>
              <span>
                {plan.durationDays === 365
                  ? "1 year · 365 days"
                  : `${plan.durationDays} days`}
              </span>
            </div>
          </div>
          <p className={styles.source}>
            {source === "loading" ? (
              "Checking the current published plan terms…"
            ) : source === "live" ? (
              <>
                <strong>Current published plan terms.</strong> Actual returns
                can differ.
              </>
            ) : (
              <>
                <strong>Reference plan rates.</strong> Live plan catalogue
                unavailable; confirm current terms before investing.
              </>
            )}
          </p>
        </div>
        <div className={styles.calcOutput}>
          <p className={styles.balanceLabel}>Illustrative ending balance</p>
          {result.growth ? (
            <>
              <output
                className={styles.calcValue}
                aria-label="Illustrative ending balance"
                aria-live="polite"
                aria-atomic="true"
              >
                {formatUsd(result.growth.balanceCents)}
              </output>
              <p className={styles.calcProfit}>
                <ArrowUpRight size={15} />
                {formatUsd(result.growth.earningsCents)} target earnings{" "}
                <span>+{earningsPercent.toFixed(2)}%</span>
              </p>
              <svg
                className={styles.chart}
                viewBox="0 0 440 145"
                role="img"
                aria-label={`Illustrative simple prorated growth from ${formatUsd(result.growth.principalCents)} to ${formatUsd(result.growth.balanceCents)} over ${days} days. This is not market performance.`}
              >
                <defs>
                  <linearGradient
                    id={`${gradientId}-fill`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#d3b87e" stopOpacity=".14" />
                    <stop offset="100%" stopColor="#d3b87e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[25, 70, 115].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="440"
                    y1={y}
                    y2={y}
                    stroke="#ffffff"
                    strokeOpacity=".07"
                    strokeDasharray="3 5"
                  />
                ))}
                <path
                  d={`M 2 130 L 432 ${result.growth.earningsCents > 0 ? 12 : 130} L 432 145 L 2 145 Z`}
                  fill={`url(#${gradientId}-fill)`}
                />
                <path
                  d={`M 2 130 L 432 ${result.growth.earningsCents > 0 ? 12 : 130}`}
                  fill="none"
                  stroke="#d7bd88"
                  strokeWidth="2"
                />
                <circle
                  cx="432"
                  cy={result.growth.earningsCents > 0 ? 12 : 130}
                  r="8"
                  fill="#d7bd88"
                  fillOpacity=".1"
                />
                <circle
                  cx="432"
                  cy={result.growth.earningsCents > 0 ? 12 : 130}
                  r="3.3"
                  fill="#e4cfaa"
                />
              </svg>
              <div className={styles.chartLabels}>
                <span>Today · {formatUsd(result.growth.principalCents)}</span>
                <span>Day {days}</span>
              </div>
              <div className={styles.calcBreakdown}>
                <div>
                  <span>Principal</span>
                  <b>{formatUsd(result.growth.principalCents)}</b>
                </div>
                <div>
                  <span>Target rate</span>
                  <b>
                    {Number((rate * 100).toFixed(4))}% /{" "}
                    {plan.monthlyRate > 0 ? "month" : "day"}
                  </b>
                </div>
                <div>
                  <span>Method</span>
                  <b>Simple prorated</b>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.calcError} role="status">
              {result.error}
            </p>
          )}
        </div>
      </div>
      <div className={styles.calcNote}>
        <Info size={13} />
        <span>
          Illustrative projection only. These high target rates are not
          guaranteed and do not represent realized performance. Figures use
          simple prorated accrual, without reinvestment, fees or taxes; a
          shareholder year is 365 days. Capital, including your entire
          investment, is at risk.
        </span>
      </div>
    </section>
  )}</TranslatedContent>;
}
export default InvestmentCalculator;
