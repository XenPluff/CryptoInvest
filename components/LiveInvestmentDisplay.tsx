"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Check, Clock3, Info } from "lucide-react";
import {
  calculateInvestmentGrowth,
  DAY_MS,
  formatUsd,
  resolveInvestmentTerms,
  timestampMs,
  type InvestmentGrowthInput,
} from "@/lib/investment";
import styles from "./investment.module.css";

export interface LiveInvestmentDisplayProps
  extends Omit<InvestmentGrowthInput, "nowTimestamp"> {
  className?: string;
}

/** Keep cents prominent while exposing four quieter illustrative sub-cent digits. */
function TargetAmount({ micros }: { micros: string }) {
  const amount = BigInt(micros);
  const cents = Number(amount / 10_000n);
  const subCents = (amount % 10_000n).toString().padStart(4, "0");
  return (
    <span className={styles.targetAmount}>
      {formatUsd(cents)}
      <span className={styles.microDigits}>{subCents}</span>
    </span>
  );
}

/** This animated target is deliberately separate from the settled wallet balance. */
export function LiveInvestmentDisplay({
  className = "",
  ...input
}: LiveInvestmentDisplayProps) {
  const [now, setNow] = useState<number | null>(null);
  const descriptionId = useId();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let endMs: number;
    try {
      endMs =
        timestampMs(input.startTimestamp) +
        resolveInvestmentTerms(input).durationDays * DAY_MS;
    } catch {
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const restart = () => {
      if (timer) clearInterval(timer);
      if (!document.hidden) {
        const current = Date.now();
        setNow(current);
        if (current < endMs)
          timer = setInterval(
            () => {
              const timestamp = Date.now();
              setNow(timestamp);
              if (timestamp >= endMs && timer) clearInterval(timer);
            },
            reduced.matches ? 5_000 : 100,
          );
      }
    };
    restart();
    document.addEventListener("visibilitychange", restart);
    reduced.addEventListener("change", restart);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", restart);
      reduced.removeEventListener("change", restart);
    };
  }, [
    input.planType,
    input.startTimestamp,
    input.durationDays,
    input.dailyRate,
    input.monthlyRate,
  ]);

  let growth;
  try {
    growth = calculateInvestmentGrowth({
      ...input,
      nowTimestamp: now ?? input.startTimestamp,
    });
  } catch {
    return (
      <div className={`${styles.liveCard} ${className}`} role="status">
        <p className={styles.eyebrow}>Investment target</p>
        <h3>Unable to calculate this target</h3>
        <p className={styles.disclaimer}>
          The investment details are incomplete. Refresh your account or contact
          support.
        </p>
      </div>
    );
  }
  const plan = resolveInvestmentTerms(input);
  const rate = plan.isMonthly ? plan.monthlyRate : plan.dailyRate;
  const duration = plan.durationDays;
  const daysRemaining = Math.ceil(growth.remainingMs / 86_400_000);
  return (
    <article
      className={`${styles.liveCard} ${className}`}
      aria-describedby={descriptionId}
    >
      <div className={styles.liveHeader}>
        <div className={styles.planIcon}>
          <ArrowUpRight size={21} strokeWidth={1.4} />
        </div>
        <div>
          <p className={styles.eyebrow}>Your investment journey</p>
          <h3 className={styles.liveTitle}>
            {plan.name}{" "}
            <span> / {duration === 365 ? "1 year" : `${duration} days`}</span>
          </h3>
        </div>
        <span
          className={`${styles.liveBadge} ${growth.isComplete ? styles.completeBadge : ""}`}
        >
          {growth.isComplete ? <Check size={11} /> : <i />}
          {growth.isComplete
            ? "Target complete"
            : growth.isFuture
              ? "Scheduled"
              : "Accruing target"}
        </span>
      </div>
      <p className={styles.balanceLabel}>
        Current Investment Balance <span>· target</span>
      </p>
      <p
        className={styles.liveBalance}
        aria-label="Illustrative investment balance"
        aria-live="off"
      >
        <TargetAmount micros={growth.balanceMicros} />
        <span className={styles.currencyUnit}>USD</span>
      </p>
      <div className={styles.earningsRow}>
        <div>
          <p className={styles.balanceLabel}>Total Earnings Accumulating</p>
          <p
            className={styles.earningsValue}
            aria-label="Illustrative accumulating earnings"
            aria-live="off"
          >
            <span>
              +<TargetAmount micros={growth.earningsMicros} />
            </span>
            <ArrowUpRight size={19} strokeWidth={1.3} />
          </p>
        </div>
        <div className={styles.rateBlock}>
          <span>{Number((rate * 100).toFixed(4))}%</span>
          <small>target / {plan.isMonthly ? "month" : "day"}</small>
        </div>
      </div>
      <div className={styles.progressLabels}>
        <span>
          {growth.isComplete ? (
            "Term completed"
          ) : growth.isFuture ? (
            "Awaiting start date"
          ) : (
            <>
              <Clock3 size={12} /> {daysRemaining}{" "}
              {daysRemaining === 1 ? "day" : "days"} remaining
            </>
          )}
        </span>
        <span>{(growth.progress * 100).toFixed(1)}%</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Investment term progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(growth.progress * 100)}
      >
        <span style={{ width: `${growth.progress * 100}%` }} />
      </div>
      <div className={styles.liveFooter}>
        <span>
          Principal <b>{formatUsd(growth.principalCents)}</b>
        </span>
        <span>
          Term target <b>{formatUsd(growth.maxBalanceCents)}</b>
        </span>
      </div>
      <p id={descriptionId} className={styles.targetNote}>
        <Info size={13} />
        <span>
          Six-decimal illustrative target, not withdrawable funds. Extra decimal
          places are not settled money. Actual returns depend on performance and
          settlement. Capital is at risk.
        </span>
      </p>
    </article>
  );
}
export default LiveInvestmentDisplay;
