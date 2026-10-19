import type { Metadata } from "next";
import {
  PublicShell,
  PageIntro,
  PublicCTA,
} from "@/components/public/PublicShell";
import { PlanCatalog } from "@/components/public/PlanCatalog";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
export const metadata: Metadata = {
  title: "Investment plans",
  description:
    "Explore Aureon investment plan parameters, time horizons, eligibility and investment risk.",
};
export default function PlansPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Investment plans"
        title="A plan for your"
        emphasis="perspective."
        description="Five investment tiers. Clearly defined parameters. Explore each time horizon with a complete understanding of the risk."
        number="02"
      />
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">The investment collection</p>
            <h2>Consider every detail.</h2>
          </div>
          <p>
            Choose a horizon that fits your circumstances. Plan rates are
            targets for illustration; returns and capital are never guaranteed.
          </p>
        </div>
        <PlanCatalog />
      </section>
      <section
        className="container public-body-section public-divider"
        id="calculator"
      >
        <div className="public-section-top">
          <div>
            <p className="eyebrow">The projection studio</p>
            <h2>Understand the numbers.</h2>
          </div>
          <p>
            Explore how the stated plan parameters translate across time. This
            calculation is an illustration, not an account balance or forecast.
          </p>
        </div>
        <InvestmentCalculator />
      </section>
      <section className="container public-body-section public-divider public-faq">
        <div className="public-faq-intro">
          <p className="eyebrow">Before you invest</p>
          <h2>Clarity comes first.</h2>
          <p>
            Make an informed decision. If anything is unclear, our support
            channel is available before you commit.
          </p>
        </div>
        <div>
          <details>
            <summary>Are these returns guaranteed?</summary>
            <p>
              No. Displayed rates are plan parameters used to illustrate
              accrual. Cryptocurrency investing involves substantial risks,
              including total loss. No target rate is a guarantee of actual
              performance.
            </p>
          </details>
          <details>
            <summary>How is the illustrative growth calculated?</summary>
            <p>
              Seven-day plans accrue linearly using the daily percentage divided
              by 86,400 seconds. The annual Shareholder illustration spreads
              120% of principal across 365 days. Earnings do not compound into
              principal. Each illustration stops at the plan duration.
            </p>
          </details>
          <details>
            <summary>What do I need before investing?</summary>
            <p>
              A registered account, verified email, approved identity
              verification and sufficient cleared balance are required.
              Financial transactions are available only when funding has been
              explicitly enabled by the operator.
            </p>
          </details>
          <details>
            <summary>Can the operator change plan parameters?</summary>
            <p>
              The operator can update available plans. An existing investment
              retains the rate and duration recorded when it was created. Always
              review the current plan terms before making a commitment.
            </p>
          </details>
        </div>
      </section>
      <PublicCTA />
    </PublicShell>
  );
}
