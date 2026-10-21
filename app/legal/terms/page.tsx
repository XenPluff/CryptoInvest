"use client";
import TranslatedContent from "@/components/TranslatedContent";
import { useDisplayLocale } from "@/lib/i18n";
import Link from "next/link";
import { LegalDocument } from "@/components/public/LegalDocument";
export default function TermsPage() {
  useDisplayLocale();
  return <TranslatedContent>{(
    <LegalDocument
      type="terms"
      title="Terms of service."
      description="Understand the account conditions, investment process, and responsibilities that apply when you use Aureon."
    >
      <h2>1. Operator & scope</h2>
      <p>
        Aureon is the platform name. The contracting legal entity, registered
        address, governing law, dispute resolution process and service
        eligibility by jurisdiction must be supplied by the operator before
        financial services are offered publicly. No incorporation, registration,
        license or authorization is implied by this website.
      </p>
      <h2>2. Eligibility & account access</h2>
      <p>
        You must be at least 18 years old, have legal capacity to enter an
        agreement and be permitted to use the services in your jurisdiction.
        Provide accurate information, verify your email and complete the
        required identity review. Do not create accounts on behalf of another
        person without lawful authority.
      </p>
      <p>
        You are responsible for securing your devices, passphrase and
        authentication codes. Report suspected unauthorized access promptly. The
        operator may restrict or suspend access for suspected misuse, identity
        concerns, legal requirements or security incidents.
      </p>
      <h2>3. Plans & investment records</h2>
      <p>
        Available plans specify minimum and maximum amounts, target rates and
        duration. Review these parameters before submitting an investment. An
        investment records the parameters in effect at creation. Illustrative
        accrual uses a linear time-based formula and stops at the recorded
        duration; it does not compound earnings into principal.
      </p>
      <p>
        Plan rates are not guarantees, verified performance or proof of economic
        activity. Realized returns, repayment and withdrawal availability depend
        on actual assets, obligations and operating conditions. You can lose all
        of your capital. Read the{" "}
        <Link href="/legal/risk">risk disclosure</Link>.
      </p>
      <h2>4. Deposits & withdrawals</h2>
      <p>
        Financial operations are unavailable until the operator explicitly
        enables funding. Transfers must use the correct asset, blockchain
        network and destination address. Deposits enter review and are credited
        only after the operator verifies the transfer and amount. A transaction
        reference does not itself prove receipt.
      </p>
      <p>
        Withdrawals require approved identity review, verified email, two-factor
        authentication and an available balance. Requested funds are reserved
        pending review. Approval is distinct from actual blockchain payment.
        Processing is subject to security checks, network conditions, liquidity
        and legal obligations. Applicable fees and processing policies must be
        disclosed before a request is accepted.
      </p>
      <h2>5. Referrals</h2>
      <p>
        A referral code may associate a new account with its referrer. Referral
        commission is conditional on an eligible approved deposit and the rules
        in force for that event. No commission is earned merely by registering.
        Additional referral levels, promotions and eligibility require explicit
        published terms. Self-referral, misleading promotion and abuse may lead
        to restrictions or reversal of improperly awarded commissions.
      </p>
      <h2>6. Acceptable use</h2>
      <p>
        Do not use the service for fraud, money laundering, sanctions evasion or
        other unlawful conduct. Do not attempt unauthorized access, interfere
        with availability, misrepresent ownership of funds or submit falsified
        identity and transaction information.
      </p>
      <h2>7. Service availability & third parties</h2>
      <p>
        Market prices are supplied by a third party and may be delayed,
        inaccurate or unavailable. Blockchain networks, email delivery and
        external custody services have separate availability and terms. No
        continuous uptime, execution price or completion time is promised.
      </p>
      <h2>8. Changes, closure & outstanding terms</h2>
      <p>
        The operator must publish an effective date and a clear notice process
        for material changes. Account closure may require resolution of
        outstanding obligations and lawful record retention. Contractual
        liability limits, complaints escalation and dispute terms must be
        completed by the operator and reviewed by counsel before these terms
        become final.
      </p>
    </LegalDocument>
  )}</TranslatedContent>;
}
