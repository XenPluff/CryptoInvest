"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Diamond,
  Gem,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { api, money } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  slug: string;
  dailyRate: number;
  monthlyRate: number;
  minAmount: number;
  maxAmount: number;
  durationDays: number;
  description: string;
  active: boolean;
}
const percent = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;
export function PlanCatalog() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ plans: Plan[] }>("/plans");
      setPlans(data.plans.filter((plan) => plan.active));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Plans are currently unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (loading)
    return (
      <div
        className="public-loading"
        aria-label="Loading investment plans"
        aria-busy="true"
      >
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="public-skeleton" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="public-error" role="alert">
        <div>
          <h3>Plans are temporarily unavailable.</h3>
          <p>{error}</p>
        </div>
        <button className="public-inline-button" onClick={() => void load()}>
          Try again <RefreshCw size={14} />
        </button>
      </div>
    );
  if (!plans.length)
    return (
      <div className="public-error">
        <div>
          <h3>A considered pause.</h3>
          <p>
            There are no active investment plans. Please check back for
            published availability.
          </p>
        </div>
      </div>
    );
  const daily = plans.filter((plan) => !plan.monthlyRate);
  const monthly = plans.filter((plan) => plan.monthlyRate);
  return (
    <>
      <div className="plan-grid">
        {daily.map((plan, index) => (
          <article
            key={plan.id}
            className={`public-plan-card ${plan.slug === "gold" ? "featured" : ""}`}
          >
            <div className="plan-icon">
              <span className="plan-index">
                0{index + 1} / {plan.durationDays} DAYS
              </span>
              <Gem size={21} strokeWidth={1} />
            </div>
            <h3>{plan.name.replace(/ Plan$/, "")}</h3>
            <div className="public-plan-rate">
              {percent(plan.dailyRate)}
              <span>/ day</span>
            </div>
            <div className="public-plan-rate-label">
              ILLUSTRATIVE TARGET RATE
            </div>
            <dl className="plan-meta">
              <div>
                <dt>Minimum</dt>
                <dd>{money(plan.minAmount)}</dd>
              </div>
              <div>
                <dt>Maximum</dt>
                <dd>{money(plan.maxAmount)}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{plan.durationDays} days</dd>
              </div>
              <div>
                <dt>Referral commission</dt>
                <dd>10% · first level</dd>
              </div>
            </dl>
            <Link
              href={`/register?plan=${plan.slug}`}
              className={`button ${plan.slug === "gold" ? "button-gold" : "button-outline"}`}
            >
              Explore {plan.name.replace(/ Plan$/, "")}{" "}
              <ArrowUpRight size={13} />
            </Link>
          </article>
        ))}
      </div>
      {monthly.map((plan) => (
        <article className="public-shareholder" key={plan.id}>
          <div>
            <p className="eyebrow">
              <Diamond
                size={12}
                style={{
                  display: "inline",
                  marginRight: 8,
                  verticalAlign: "middle",
                }}
              />
              A longer perspective
            </p>
            <h3>{plan.name.replace(/ Plan$/, "")}</h3>
            <p>
              {plan.description ||
                "A long-duration plan with an annual investment horizon."}
            </p>
          </div>
          <div>
            <div className="public-plan-rate">
              {percent(plan.monthlyRate)}
              <span>/ month</span>
            </div>
            <p>
              Illustrative dividend target.
              <br />
              Actual outcomes can differ.
            </p>
          </div>
          <div>
            <dl className="plan-meta">
              <div>
                <dt>Investment range</dt>
                <dd>
                  {money(plan.minAmount)} – {money(plan.maxAmount)}
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>
                  {plan.durationDays === 365
                    ? "1 year"
                    : `${plan.durationDays} days`}
                </dd>
              </div>
              <div>
                <dt>Referral commission</dt>
                <dd>10% · first level</dd>
              </div>
            </dl>
            <Link
              href={`/register?plan=${plan.slug}`}
              className="button button-outline"
            >
              Explore Shareholder <ArrowRight size={13} />
            </Link>
          </div>
        </article>
      ))}
      <p className="plan-caption">
        Rates are plan parameters used for illustrative accrual. They are
        exceptionally high and do not represent guaranteed earnings, verified
        historical performance, or a promise of repayment. Referral commissions
        are conditional on approved deposits and funding availability.
      </p>
      <div className="public-notice">
        <ShieldAlert size={17} />
        <span>
          Capital is at risk. You could lose some or all of your investment.
          Account verification, approved KYC, and funding availability are
          required before investing. Read the{" "}
          <Link href="/legal/risk">risk disclosure</Link>.
        </span>
      </div>
    </>
  );
}
