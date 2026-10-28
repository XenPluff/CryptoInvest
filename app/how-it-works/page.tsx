"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import {
  PublicShell,
  PageIntro,
  PublicCTA,
} from "@/components/public/PublicShell";
const steps = [
  {
    title: "Create your account.",
    description:
      "Register with your name, email and a unique passphrase. Verify your email using the secure link sent to your inbox.",
  },
  {
    title: "Secure your account.",
    description:
      "Identity review is optional for deposits. Complete it before investing or withdrawing. You can also enable two-factor authentication for additional protection.",
  },
  {
    title: "Fund with care.",
    description:
      "When funding is available, select an asset and its exact network. Verify the destination before transferring, then submit the transaction reference for operator review.",
  },
  {
    title: "Choose your perspective.",
    description:
      "Review plan parameters and the complete risk disclosure. Invest only a cleared available balance, then monitor the investment record and illustrative accrual in your dashboard.",
  },
];
export default function HowItWorksPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <PublicShell>
      <PageIntro
        eyebrow="How it works"
        title="Every step,"
        emphasis="considered."
        description="A clear path from your first visit to a verified account. Take the time to understand the process before committing capital."
        number="06"
      />
      <section className="container public-body-section">
        <Link href="/videos#getting-started" className="public-inline-button">
          Prefer to watch? Explore the video guides <ArrowUpRight size={14} />
        </Link>
      </section>
      <section className="container public-body-section public-divider">
        <div className="public-process">
          {steps.map((step, i) => (
            <article className="public-process-step" key={step.title}>
              <span>0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container public-body-section public-divider public-security-grid">
        <div>
          <p className="eyebrow">Know what the numbers mean</p>
          <h2>
            Real records.
            <br />
            Clear projections.
          </h2>
          <p>
            Your dashboard separates cleared account funds, active investment
            principal, transaction status and illustrative time-based accrual. A
            ticking projection is not proof that a trade occurred or that a
            return has been realized.
          </p>
          <Link className="public-inline-button" href="/plans#calculator">
            Explore the illustrative calculator <ArrowUpRight size={14} />
          </Link>
        </div>
        <div>
          <div className="public-notice">
            <Info size={18} />
            <span>
              Funding availability depends on the operator’s configuration.
              Deposits and withdrawals involve operator review. Public financial
              launch also requires verified legal, custody and regulatory
              disclosures.
            </span>
          </div>
          <p>
            Always check the asset, network, address, amount and applicable
            terms. Cryptocurrency transfers are generally irreversible, and
            capital can be lost.
          </p>
        </div>
      </section>
      <PublicCTA />
    </PublicShell>
  )}</TranslatedContent>;
}
