"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { api, money } from "@/lib/api";
import { displayLocale, useTranslation } from "@/lib/i18n";
import { PlanArtwork, planVariant } from "./PlanArtwork";
import styles from "./plan-frame.module.css";

type PublishedPlan = {
  id: string; name: string; slug: string; active: boolean;
  dailyRate: number; monthlyRate: number; minAmount: number;
  maxAmount: number; durationDays: number; description: string;
};
const introductions: Record<string, { tag: string; description: string }> = {
  starter: { tag: "THE FIRST CHAPTER", description: "Your first step towards a broader perspective." },
  elite: { tag: "A NEW PERSPECTIVE", description: "An elevated approach to your next chapter." },
  gold: { tag: "THE SIGNATURE COLLECTION", description: "A considered allocation. A wider horizon." },
};

export function LandingPlanCollection() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PublishedPlan[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    api<{ plans: PublishedPlan[] }>("/plans", { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setPlans(data.plans.filter(p => p.active && !p.monthlyRate).slice(0, 3));
        setState("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [retry]);
  if (state === "loading") return <div className={styles.loading} aria-busy="true" aria-label={t("Loading investment plans")}>
    {[0, 1, 2].map(n => <div key={n} />)}
  </div>;
  if (state === "error") return <div className={styles.unavailable} role="alert">
    <p>{t("Plans are temporarily unavailable.")}</p>
    <button type="button" onClick={() => setRetry(n => n + 1)}>{t("Try again")} <RefreshCw size={15} /></button>
  </div>;
  if (!plans.length) return <div className={styles.unavailable}><p>{t("There are no active investment plans. Please check back for published availability.")}</p></div>;
  return <div className={`landing-plans ${styles.landingGrid}`}>
    {plans.map((plan, index) => {
      const variant = planVariant(plan.slug, index);
      const intro = introductions[plan.slug];
      return <article className={`landing-plan ${styles.frame} ${styles[variant]}`} key={plan.id} data-plan-slug={plan.slug}>
        <div className="plan-card-top">
          <span className="eyebrow">{t(intro?.tag || "Investment plans")}</span>
          <span>{String(index + 1).padStart(2, "0")}</span>
        </div>
        <PlanArtwork variant={variant} />
        <h3>{plan.name.replace(/ Plan$/, "")}</h3>
        <p>{t(intro?.description || plan.description)}</p>
        <div className="plan-rate">
          {(plan.dailyRate * 100).toLocaleString(displayLocale(), { maximumFractionDigits: 2 })}
          <span>%<small>/ {t("day")}</small></span>
        </div>
        <span className="target-caption">{t("ILLUSTRATIVE TARGET RATE")}</span>
        <div className="plan-card-details">
          <div><span>{t("Investment range")}</span><strong>{money(plan.minAmount)} – {money(plan.maxAmount)}</strong></div>
          <div><span>{t("Investment duration")}</span><strong>{t(`${plan.durationDays} days`)}</strong></div>
        </div>
        <Link href={`/plans#${plan.slug}`} className="button button-outline">
          {t("Explore")} {plan.name.replace(/ Plan$/, "")}<ArrowUpRight size={16} />
        </Link>
      </article>;
    })}
  </div>;
}
