"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import {
  PublicShell,
  PageIntro,
  PublicCTA,
} from "@/components/public/PublicShell";
import { MarketCurrency } from "@/components/public/MarketCurrency";
export default function InsightsPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="Market insights"
        title="The market moves."
        emphasis="Stay considered."
        description="A clear view of the digital asset market. Live pricing alongside the context you need to approach it with perspective."
        number="03"
      />
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">The market at a glance</p>
            <h2>Signal. Without the noise.</h2>
          </div>
          <p>
            Real prices from the connected market data provider. An honest
            availability state when the source cannot be reached.
          </p>
        </div>
        <MarketCurrency />
      </section>
      <section className="container public-body-section public-divider">
        <div className="public-section-top">
          <div>
            <p className="eyebrow">The essentials</p>
            <h2>A more informed perspective.</h2>
          </div>
          <p>
            Educational reading to support your own research. This material is
            not personal investment advice.
          </p>
        </div>
        <div className="public-reading-grid">
          <article className="public-reading-card">
            <p className="eyebrow">01 / Market structure</p>
            <h3>Volatility is a feature of the landscape.</h3>
            <p>
              Digital asset prices can change sharply at any hour. A 24-hour
              percentage describes the recent past, not what comes next.
              Consider potential losses and liquidity before making any
              allocation.
            </p>
          </article>
          <article className="public-reading-card">
            <p className="eyebrow">02 / Investment horizons</p>
            <h3>Time does not remove risk.</h3>
            <p>
              Longer time horizons can change how you experience volatility, but
              they do not guarantee recovery or returns. Understand lockups,
              withdrawal restrictions and the terms that apply to your capital.
            </p>
          </article>
          <article className="public-reading-card">
            <p className="eyebrow">03 / Independent research</p>
            <h3>Look beyond the headline rate.</h3>
            <p>
              Review the operator, custody arrangements, jurisdiction, strategy
              and counterparty exposure. Exceptionally high target rates carry
              significant risk and warrant extra scrutiny.
            </p>
          </article>
        </div>
      </section>
      <PublicCTA title="Bring perspective to your next move." />
    </PublicShell>
  )}</TranslatedContent>;
}
