"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { LegalDocument } from "@/components/public/LegalDocument";
import documentStyles from "@/components/public/formal-legal.module.css";
import styles from "./aml-policy.module.css";

export default function AmlPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <LegalDocument type="aml" title="AML & identity." notice={null} wide>
      <section className={`${documentStyles.document} ${styles.policy}`} aria-labelledby="aml-document-title">
        <header className={documentStyles.header}>
          <span className={documentStyles.brand} translate="no">AUREON</span>
          <span className={documentStyles.ornament} aria-hidden="true"><i /></span>
          <h2 id="aml-document-title">AML & Identity Policy</h2>
        </header>
        <div className={styles.sections}>
          <section aria-labelledby="aml-section-one">
            <h3 id="aml-section-one">Section I: General Legal Disclosures & Regulatory Status</h3>
            <h4>Speculative & High-Risk Nature of Assets</h4>
            <p>Digital assets, multi-sector alternative investments, commodity-backed instruments and private equity initiatives are speculative, highly volatile and subject to potential illiquidity. Investors must possess a high-risk tolerance and the financial capacity to absorb the complete loss of their principal investment.</p>
            <h4>Absence of Government Insurance</h4>
            <p>AUREON investments and any future digital units, including the AUREON Digital Unit (AUDU), are not bank deposits and are not insured, guaranteed or backed by the Federal Deposit Insurance Corporation (FDIC), the Securities Investor Protection Corporation (SIPC), any government agency, central bank or statutory financial protection scheme.</p>
            <h4>Regulatory Oversight & Jurisdictional Variance</h4>
            <p>The intended corporate structure would encompass affiliated entities and divisions operating under the relevant commercial registrations, governance standards and financial permissions. The regulatory treatment of crypto mining, decentralized financial protocols, real estate syndications and commodity-backed products depends on the activity and jurisdiction. Corporate registration alone does not establish authorization to provide financial services.</p>
            <h4>Financial Promotions & Institutional Restriction</h4>
            <p>Any restricted investment offering would be directed at accredited investors, institutional entities, corporate treasuries and qualified individuals meeting the applicable statutory and experience requirements. Participation would depend on eligibility verification, jurisdictional availability and effective distribution controls. Public website material does not itself establish investor eligibility or an offering exemption.</p>
          </section>
          <section aria-labelledby="aml-section-two">
            <h3 id="aml-section-two">Section II: Anti-Money Laundering (AML) & Counter-Terrorist Financing (CTF) Policy</h3>
            <h4>Commitment to Compliance</h4>
            <p>The service must not be used for money laundering, terrorist financing, sanctions evasion or illicit financial transactions. The intended AML/CTF framework would align with Financial Action Task Force (FATF) recommendations and applicable regional statutes, supported by designated compliance personnel, documented procedures and a risk assessment.</p>
            <h4>Customer Due Diligence (CDD) & Identity Verification (KYC)</h4>
            <p>Under this framework, participation in any future institutional pools, issuance of AUDU or access to alternative asset portfolios would require appropriate individual or corporate KYC and customer due diligence before acceptance.</p>
            <h4>Current Application Access</h4>
            <p>The application currently uses manual operator review of submitted identity details. Email-verified investors may submit deposits without identity approval; investments and withdrawals require an approved identity review. The automated verification, screening and monitoring controls described in this framework are planned requirements.</p>
            <h4>Required Documentation</h4>
            <p>For individuals, the framework would require government-issued photo identification, such as a passport or national ID, proof of residential address dated within three months, and evidence of accredited or qualified status where applicable.</p>
            <p>For corporate entities, the framework would require incorporation documents, beneficial ownership records identifying individuals owning 25% or more, and authorized signatory resolutions, with further information where required by applicable law or risk assessment.</p>
            <h4>Enhanced Due Diligence (EDD)</h4>
            <p>EDD requirements would include source-of-wealth and source-of-funds reviews for designated high-net-worth accounts, politically exposed persons (PEPs) and corporate entities from higher-risk jurisdictions. Automated escalation would depend on implementing and validating the relevant risk criteria and review procedures.</p>
            <h4>Sanctions Screening & Prohibited Jurisdictions</h4>
            <p>Participant, wallet-address and institutional-counterparty screening would include applicable lists maintained by the Office of Foreign Assets Control (OFAC), the United Nations, the European Union and the U.K. Treasury. Applicable sanctions, legal restrictions and the adopted jurisdiction policy would determine eligibility and any required access restrictions.</p>
            <h4>Transaction Monitoring & Suspicious Activity Reporting (SAR)</h4>
            <p>The framework calls for automated monitoring of on-chain transactions, wallet activity and relevant fiat flows to identify anomalous patterns, velocity spikes or mixing-service interactions. Operating these controls would require implemented data connections, detection rules and an authorized review process.</p>
            <h4>Suspicious Activity Reporting</h4>
            <p>Designated compliance personnel would assess escalated activity, restrict accounts or transactions where legally authorized, and file reports with the appropriate financial intelligence units when required by applicable law. Reporting decisions, confidentiality requirements and any asset restrictions would follow the relevant jurisdiction's legal procedures.</p>
            <h4>Record Keeping</h4>
            <p>The retention framework would require identity verification records, KYC documentation, transaction logs and institutional communications to be securely retained for at least five years after the customer relationship ends, subject to applicable jurisdictional retention and privacy obligations. Access for authorized regulatory examination would follow those legal requirements.</p>
          </section>
          <section aria-labelledby="aml-section-three">
            <h3 id="aml-section-three">Section III: Intellectual Property & Trademark Notice</h3>
            <p>AUREON Group LLC is the intended entity name for this framework. Trademark and service-mark registrations for AUREON, the AUREON logo, AUREON Ventures, AUREON Asset Management and the AUREON Digital Unit (AUDU) would be pursued through the relevant registries. Use of protected brand assets, whitepapers or software materials requires the rights holder's permission except where permitted by law.</p>
          </section>
        </div>
        <footer className={documentStyles.footer}>
          <p>© 2026 AUREON. All rights reserved.</p>
          <p className={documentStyles.version} translate="no">AUR-AML-2026.V1</p>
        </footer>
      </section>
    </LegalDocument>
  )}</TranslatedContent>;
}
