import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
export const metadata: Metadata = { title: "Privacy notice" };
export default function PrivacyPage() {
  return (
    <LegalDocument
      type="privacy"
      title="Privacy notice."
      description="What information is collected, why it is needed, and how to raise questions about your personal data."
    >
      <h2>1. Data controller</h2>
      <p>
        The operator must publish the data controller’s legal name, registered
        address, privacy contact, applicable legal framework and any appointed
        representative before launch. This initial notice describes the
        application’s current data categories and intended processing.
      </p>
      <h2>2. Information collected</h2>
      <ul>
        <li>
          Account information: name, email, password hash, verification status
          and referral relationship.
        </li>
        <li>
          Identity information: full name, country, date of birth, document type
          and document number submitted through the identity form.
        </li>
        <li>
          Financial records: deposit and withdrawal requests, amounts, wallet
          addresses, asset networks, transaction references and investment
          records.
        </li>
        <li>
          Security information: authentication events, session records, audit
          events, and available network address information.
        </li>
        <li>
          Communication information: support enquiries, newsletter subscriptions
          and account notifications.
        </li>
        <li>
          Pre-launch card applications: your account identity, preferred network
          design and card format, country of residence, intended use, age
          attestation, versioned acknowledgements, review messages and status
          history. No card number, CVV, PIN, credit limit, bank account details
          or additional identity documents are requested in this form.
        </li>
      </ul>
      <h2>3. Why it is processed</h2>
      <p>
        Information is used to operate accounts, verify access, review identity,
        maintain transaction records, prevent abuse, support users and meet
        applicable recordkeeping obligations. The operator must establish and
        document a valid legal basis for each processing activity, including
        contract, legal obligation, legitimate interest or consent where
        appropriate.
      </p>
      <p>
        Card preferences are used for preliminary application review and account
        updates. A withdrawal closes the application but retains its historical
        record; you may contact support to exercise applicable data rights.
        This process does not run a credit check, issue a card or automatically
        share an application with a bank or card network. Any future issuer
        processing requires an identified partner and updated information and
        terms before that processing begins.
      </p>
      <h2>4. Cookies & local preferences</h2>
      <p>
        An HTTP-only session cookie authenticates your account. Local browser
        preferences may store your display theme and motion or sound
        preferences. The core application does not require advertising cookies.
        If analytics or marketing trackers are introduced, the operator must
        disclose them and obtain consent where required.
      </p>
      <h2>5. Service providers & international transfers</h2>
      <p>
        Hosting, database and email services may process personal information as
        necessary to provide the service. The deployed transactional email
        service uses Brevo. Deposits
        use the supplied wallet addresses, with no external deposit-provider
        connection. No card-issuing provider is integrated with the pre-launch
        application process.
      </p>
      <p>
        The operator must publish its final processor list, locations,
        processing agreements and any applicable international transfer
        safeguards before production data is processed by those providers.
      </p>
      <h2>6. Security & retention</h2>
      <p>
        Passwords are hashed, authentication sessions use HTTP-only cookies, and
        sensitive authentication material is protected on the server. These
        controls do not eliminate every security risk. Production access
        control, encryption, backups, incident response and monitoring require
        operational configuration.
      </p>
      <p>
        Records are retained only as necessary for the purpose and applicable
        legal obligations. The operator must set and publish specific retention
        periods or criteria. Financial and identity records may require longer
        retention; account deletion does not necessarily erase legally required
        records.
      </p>
      <h2>7. Your rights & choices</h2>
      <p>
        Depending on applicable law, you may request access, correction,
        deletion, restriction, portability or an objection to certain
        processing. You may withdraw consent where processing depends on
        consent. Submit a request through support; identity verification may be
        required. The operator must provide the applicable regulator and
        complaint procedure for its jurisdiction.
      </p>
      <h2>8. Children & updates</h2>
      <p>
        The service is not intended for anyone under 18. Do not submit a child’s
        information. Material changes to this notice require an updated version
        and effective date, with additional notice where required.
      </p>
    </LegalDocument>
  );
}
