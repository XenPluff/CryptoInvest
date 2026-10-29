"use client";
import Link from "next/link";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { LegalDocument } from "@/components/public/LegalDocument";
import documentStyles from "@/components/public/formal-legal.module.css";
import styles from "@/components/public/structured-legal.module.css";

export default function PrivacyPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <LegalDocument
      type="privacy"
      title="Privacy notice."
      description="What information is collected, why it is needed, and how to raise questions about your personal data."
      notice={null}
      wide
    >
      <section className={`${documentStyles.document} ${styles.policy}`} aria-labelledby="privacy-document-title">
        <header className={documentStyles.header}>
          <span className={documentStyles.brand} translate="no">AUREON</span>
          <span className={documentStyles.ornament} aria-hidden="true"><i /></span>
          <h2 id="privacy-document-title">Legal & Disclosures, Privacy Notice</h2>
        </header>
        <div className={styles.sections}>
          <section aria-labelledby="privacy-section-one">
            <h3 id="privacy-section-one">1. Overview & Scope</h3>
            <p>This Privacy Notice explains how the AUREON application handles account, identity, financial and communication data. AUREON Group LLC is the intended entity name; its controller identity, registered address and applicable jurisdiction remain to be published. Future institutional services, smart-contract activities and the AUREON Digital Unit (AUDU) would require updated privacy information before processing begins.</p>
            <p>The service is intended for adults aged 18 or over. Material changes to this notice will be identified by an updated version and effective date, with additional notice where required.</p>
          </section>
          <section aria-labelledby="privacy-section-two">
            <h3 id="privacy-section-two">2. Information We Collect</h3>
            <h4>Identity & Contact Data</h4>
            <p>Current account and identity forms collect names, email addresses, country, date of birth, identity document type and document number. Account records include password hashes, verification status and referral relationships. Collecting document images, residential addresses, telephone numbers or accredited status for future onboarding would require an updated collection notice.</p>
            <h4>Corporate & Beneficial Ownership Data</h4>
            <p>Future corporate onboarding would require relevant registration documents, incorporation records, resolutions, tax identifiers and beneficial ownership information, including individuals holding 25% or greater equity or voting rights where applicable. These are planned requirements rather than a description of a current corporate onboarding form.</p>
            <h4>Financial & Transactional Data</h4>
            <p>The application records deposit and withdrawal requests, amounts, wallet addresses, networks, available transaction references and investment activity. Bank details, wire origins, source-of-funds or source-of-wealth documents and AUDU minting, burning or redemption records would be collected only if the corresponding services and lawful requirements are established.</p>
            <h4>Technical & On-Chain Data</h4>
            <p>Security records include authentication events, sessions, administrative audit events and available network address information. Any future device profiling, smart-contract monitoring or blockchain analytics would require appropriate implementation, purpose and privacy disclosures.</p>
            <h4>Communications & Card Preferences</h4>
            <p>Support enquiries, newsletter subscriptions and account notifications are recorded. Pre-launch card applications also record design and format preferences, residence country, intended use, age attestation, acknowledgements, review messages and status history. The form does not request card numbers, CVVs, PINs, bank details or extra identity documents.</p>
          </section>
          <section aria-labelledby="privacy-section-three">
            <h3 id="privacy-section-three">3. How We Use Your Information</h3>
            <h4>Regulatory Compliance & Verification</h4>
            <p>Submitted identity details currently support manual operator review. Automated KYC, AML, CTF and sanctions screening are planned requirements whose operation would depend on implemented providers, procedures and applicable legal obligations.</p>
            <h4>Account Administration & Operations</h4>
            <p>Information supports accounts, access checks, financial requests, investment records and preliminary card review. Card applications do not issue cards, run credit checks or automatically transfer applications to banks or networks. AUDU issuance and redemption would require established services and updated terms before related processing.</p>
            <h4>Security & Fraud Prevention</h4>
            <p>Authentication and audit records support access security, abuse prevention and operator review. Any automated monitoring of external wallets, smart contracts or financial flows would require established data connections and controls.</p>
            <h4>Communications</h4>
            <p>Contact information is used for account notices, support replies and subscribed communications. Future regulatory reports or institutional statements would depend on the relevant services and obligations.</p>
          </section>
          <section aria-labelledby="privacy-section-four">
            <h3 id="privacy-section-four">4. Legal Basis for Processing</h3>
            <p>Each processing purpose must have a documented lawful basis under the applicable jurisdiction. Depending on the activity and law, the following bases may apply.</p>
            <h4>Legal Obligation</h4>
            <p>Processing may be required for applicable identity, AML, CTF, tax or recordkeeping duties; the relevant obligation must be identified for the activity and jurisdiction.</p>
            <h4>Contractual Necessity</h4>
            <p>Processing may be necessary to provide requested account services or fulfil applicable agreements. Future institutional mandates would require the corresponding agreements and permissions.</p>
            <h4>Legitimate Interests</h4>
            <p>Security, fraud prevention and service operation may rely on legitimate interests where lawful, after considering necessity and the individual's rights.</p>
            <h4>Explicit Consent</h4>
            <p>Optional communications or preferences may rely on consent where required. Consent can be withdrawn without affecting prior lawful processing.</p>
          </section>
          <section aria-labelledby="privacy-section-five">
            <h3 id="privacy-section-five">5. Data Sharing & Disclosure</h3>
            <p>AUREON does not sell, rent or trade personal data. Any disclosure must be limited to a lawful purpose, with appropriate confidentiality and access safeguards.</p>
            <h4>Regulators & Law Enforcement</h4>
            <p>Information may be disclosed to competent authorities when required by applicable law or valid legal process.</p>
            <h4>Institutional Custodians & Banking Partners</h4>
            <p>No institutional custodian, banking partner or card issuer is integrated into the current application. Future sharing would require an identified provider, a lawful basis and updated privacy information before the arrangement begins.</p>
            <h4>Service Providers</h4>
            <p>Hosting, database and email providers process information necessary to operate the service; transactional email uses Brevo. The operator must publish the processor list, locations, processing agreements and applicable international transfer safeguards. Deposits use operator-supplied wallet addresses rather than an external deposit-provider integration.</p>
          </section>
          <section aria-labelledby="privacy-section-six">
            <h3 id="privacy-section-six">6. Data Security & Retention</h3>
            <h4>Security Measures</h4>
            <p>Passwords are hashed, sessions use HTTP-only cookies and administrative actions use role-based access controls. Encryption at rest, multi-signature wallet governance, continuous monitoring, backups and incident response require verified operational configuration; this notice does not establish that all such controls are active. No system eliminates every security risk.</p>
            <h4>Retention Period</h4>
            <p>The intended retention framework would retain relevant identity, corporate and transaction records for at least five years after the relationship or relevant transaction ends, subject to applicable law and privacy obligations. Specific schedules remain to be published. Card application withdrawal closes the application but retains its history; deletion requests do not necessarily erase records that must lawfully be kept.</p>
          </section>
          <section aria-labelledby="privacy-section-seven">
            <h3 id="privacy-section-seven">7. Your Privacy Rights</h3>
            <p>Your rights depend on applicable law and may include the following.</p>
            <h4>Right of Access & Rectification</h4>
            <p>You may request confirmation of processing, access to your information and correction of inaccurate records.</p>
            <h4>Right to Erasure / Restriction</h4>
            <p>You may request deletion or restriction, or object to certain processing, subject to applicable legal grounds and retention duties.</p>
            <h4>Right to Data Portability</h4>
            <p>Where applicable, you may request your data in a structured, commonly used electronic format.</p>
            <h4>Cookies & Preferences</h4>
            <p>An HTTP-only cookie authenticates sessions. Local browser storage holds language, theme and other display preferences. Advertising cookies are not required for the core service; additional analytics or marketing trackers would require appropriate notice and consent where applicable.</p>
            <p>Use the privacy contact below for requests. Identity verification may be needed. The operator must identify the applicable supervisory authority and complaint procedure; no appointed Data Protection Officer is established by this notice.</p>
            <p><Link href="/support">support contact form</Link></p>
          </section>
        </div>
        <footer className={documentStyles.footer}>
          <p>© 2026 AUREON. All rights reserved.</p>
          <p className={documentStyles.version} translate="no">AUR-PRIV-2026.V1</p>
        </footer>
      </section>
    </LegalDocument>
  )}</TranslatedContent>;
}
