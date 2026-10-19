import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
export const metadata: Metadata = { title: "Risk disclosure" };
export default function RiskPage() {
  return (
    <LegalDocument
      type="risk"
      title="Risk disclosure."
      description="Cryptocurrency investments carry substantial risk. Read this information before transferring assets or purchasing an investment plan."
    >
      <h2>1. You can lose all of your capital</h2>
      <p>
        Digital assets and related investment arrangements are speculative. They
        may be unsuitable for your circumstances. Invest only what you can
        afford to lose and seek independent legal, tax and financial advice.
        Past performance does not guarantee future returns.
      </p>
      <h2>2. Exceptionally high target rates</h2>
      <p>
        The displayed daily target rates of 2.5%, 3%, 4% and 5%, and the monthly
        target dividend rate of 10%, are exceptionally high. Their display is
        not evidence that those outcomes can be achieved or sustained. No
        independently verified track record, trading strategy, audited financial
        statements or evidence of return-generating assets has been published
        here.
      </p>
      <p>
        Time-based counters and calculator outputs are arithmetic illustrations.
        They do not establish realized profit, actual trading performance,
        solvency, or a legally enforceable guarantee. An amount displayed as
        accruing is not necessarily available for withdrawal.
      </p>
      <h2>3. Market, liquidity & counterparty risk</h2>
      <p>
        Prices may fluctuate rapidly and without a clear cause. Markets can
        become illiquid. Assets, exchanges, stablecoin issuers, counterparties
        or the operator may fail or become insolvent. Redemptions and
        withdrawals may be delayed or unavailable. A stablecoin can lose its
        intended peg.
      </p>
      <h2>4. Custody & operational risk</h2>
      <p>
        Deposit addresses are operator-configured blockchain destinations.
        Publicly visible addresses do not prove control, security, segregation
        of funds or adequacy of reserves. Cold storage, custody insurance and
        independent custody audits have not been established through this
        website.
      </p>
      <p>
        Deposits are sent directly to the supplied operator receiving addresses.
        The operator manages those wallets and reviews transfer evidence before
        crediting an account. Errors, compromise, insider misconduct, service
        outages or loss of keys can cause irreversible loss.
      </p>
      <h2>5. Blockchain & transfer risk</h2>
      <p>
        Cryptocurrency transfers are generally irreversible. Incorrect
        addresses, networks, asset contracts or memo fields can cause permanent
        loss. Network congestion, forks, software defects, smart-contract
        vulnerabilities and confirmation delays may affect transfers. A
        submitted transaction hash can be incorrect or unrelated to a payment.
      </p>
      <h2>6. Regulation & legal protection</h2>
      <p>
        Laws vary by jurisdiction and may change. Access to certain products may
        be restricted or prohibited. The operator’s legal entity, regulatory
        registrations, license scope and permitted territories must be published
        and independently verified. Do not infer regulatory approval, deposit
        protection, government backing or compensation coverage from the
        platform’s design or terminology.
      </p>
      <h2>7. Tax & personal circumstances</h2>
      <p>
        You are responsible for understanding applicable tax reporting and
        payment obligations. The suitability of any allocation depends on your
        objectives, financial situation, experience and risk tolerance. General
        educational material and plan illustrations are not personalized advice.
      </p>
      <h2>8. Independent due diligence</h2>
      <p>
        Before funding, review the operator’s identity and financial position,
        the actual investment strategy, custody arrangement, audited evidence,
        withdrawal terms and dispute procedures. If these details are absent or
        unsatisfactory, do not transfer assets. This disclosure is not
        exhaustive and does not waive any rights available under applicable law.
      </p>
    </LegalDocument>
  );
}
