"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import { LegalDocument } from "@/components/public/LegalDocument";
export default function AmlPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <LegalDocument
      type="aml"
      title="AML & identity."
      description="A clear account of identity review, transaction checks, and the verification capabilities that must be completed before financial launch."
    >
      <h2>1. Purpose & policy ownership</h2>
      <p>
        The service must not be used for money laundering, terrorist financing,
        sanctions evasion, fraud or other unlawful activity. The operator must
        appoint responsible compliance personnel and publish its legal
        jurisdiction, applicable obligations and formal risk-based compliance
        policy before offering financial services.
      </p>
      <h2>2. Current identity workflow</h2>
      <p>
        The application collects full name, country, date of birth, identity
        document type and document number through an account form. The
        submission is reviewed by an authorized operator, who records approval
        or rejection. This is a manual administrative workflow; a form
        submission and manual approval alone do not establish regulated KYC or
        AML compliance.
      </p>
      <p>
        Automated document authenticity checks, biometric liveness, sanctions
        screening, politically exposed person screening and independent
        identity-provider verification have not been represented as active
        integrations.
      </p>
      <h2>3. Eligibility & verification</h2>
      <p>
        Financial access requires verified email and an approved identity status
        in the application. Users must supply accurate information and cooperate
        with lawful requests. The operator may require further evidence of
        identity, residence, source of funds, source of wealth or beneficial
        ownership before accepting or processing activity.
      </p>
      <h2>4. Transaction review</h2>
      <p>
        Deposits and withdrawals are subject to operator review. Deposit credit
        requires verification of the actual transfer and confirmed amount.
        Withdrawal review includes the destination, available balance and
        account eligibility. An authenticator code is required for withdrawal requests
        only when the investor has enabled two-factor authentication.
      </p>
      <p>
        The operator must define risk scoring, blockchain analytics, sanctions
        checks, suspicious activity escalation and applicable reporting
        procedures. The current review queue is not a substitute for a complete
        transaction-monitoring program.
      </p>
      <h2>5. Restrictions & escalation</h2>
      <p>
        Where permitted or required by law, access or transactions may be
        restricted while suspicious activity, identity inconsistencies or
        prohibited activity is reviewed. Reports to competent authorities and
        restrictions on disclosure must be handled by authorized compliance
        personnel under applicable law. This application does not independently
        determine legal reporting obligations.
      </p>
      <h2>6. Records & privacy</h2>
      <p>
        Identity review outcomes, financial records and administrative audit
        events are retained to support account operations and review. The
        operator must establish jurisdiction-specific retention periods, access
        controls, data protection procedures and evidence preservation. Personal
        information must be handled in accordance with the privacy notice and
        applicable law.
      </p>
      <h2>7. Requirements before launch</h2>
      <p>
        A final program requires legal and compliance approval, a documented
        risk assessment, responsible personnel, screening and identity-provider
        decisions, training, ongoing monitoring, recordkeeping and independent
        review appropriate to the operating jurisdiction. Until these are
        established, this document is an implementation outline rather than a
        certification of compliance.
      </p>
    </LegalDocument>
  )}</TranslatedContent>;
}
