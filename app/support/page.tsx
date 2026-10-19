import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, MessageSquareText } from "lucide-react";
import { PublicShell, PageIntro } from "@/components/public/PublicShell";
import { ContactForm } from "@/components/public/ContactForm";
export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with your Aureon account, identity verification, transactions and privacy requests.",
};
export default function SupportPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Support"
        title="A conversation,"
        emphasis="with clarity."
        description="Questions deserve thoughtful answers. Find guidance below, or send a message directly to the support queue."
        number="07"
      />
      <section
        className="container public-body-section public-divider public-contact-grid"
        id="contact"
      >
        <div>
          <p className="eyebrow">Let’s talk</p>
          <h2>We’re here to help.</h2>
          <p>
            Tell us what you need. If your question concerns a transaction,
            include its reference and the blockchain network so it can be
            reviewed accurately.
          </p>
          <div className="public-contact-note">
            <MessageSquareText color="var(--gold)" size={20} />
            <strong>A direct channel.</strong>
            <p>
              Messages are saved for operator review. A custom-domain support
              email and live chat will be published after they have been
              configured. No response-time guarantee is currently offered.
            </p>
          </div>
          <div className="public-contact-note">
            <ShieldCheck color="var(--gold)" size={20} />
            <strong>Protect your information.</strong>
            <p>
              Never include passwords, recovery phrases, private wallet keys or
              one-time authentication codes. Our support process does not
              require them.
            </p>
          </div>
        </div>
        <ContactForm />
      </section>
      <section className="container public-body-section public-divider public-faq">
        <div className="public-faq-intro">
          <p className="eyebrow">A little guidance</p>
          <h2>
            Frequently
            <br />
            considered.
          </h2>
          <p>
            Answers to common questions about getting started, verification and
            the way your account works.
          </p>
        </div>
        <div>
          <details>
            <summary>I haven’t received my verification email.</summary>
            <p>
              Check your spam folder and confirm that the address was entered
              correctly. Return to the email verification page to request
              another link. If email delivery is not configured, contact the
              operator through this form.
            </p>
          </details>
          <details>
            <summary>How does funding availability work?</summary>
            <p>
              Administrators can enable or pause funding in platform settings. A
              pause stops new financial postings. Verified email, approved
              identity review and two-factor authentication are still required
              for investor financial activity.
            </p>
          </details>
          <details>
            <summary>When does a deposit become available?</summary>
            <p>
              Submitting a transaction reference creates a pending deposit
              record. The operator must verify the transfer and confirmed amount
              before it is credited. A submission is not evidence that the
              blockchain transfer has settled.
            </p>
          </details>
          <details>
            <summary>Why does my withdrawal show as pending?</summary>
            <p>
              Withdrawals require identity verification, two-factor
              authentication and sufficient available funds. A valid request
              reserves funds for review. The operator records a paid status and
              blockchain reference after payment.
            </p>
          </details>
          <details>
            <summary>Is the live investment counter a realized profit?</summary>
            <p>
              No. It is a time-based accrual illustration based on your recorded
              plan parameters. It does not establish realized trading gains or
              guarantee that funds are available to withdraw. Review the terms
              and transaction status in your account.
            </p>
          </details>
          <details>
            <summary>
              How can I request access to or deletion of my data?
            </summary>
            <p>
              Use the contact form and choose “Privacy & data request.” Identity
              verification may be needed. Some records may need to be retained
              to meet applicable legal requirements; see the{" "}
              <Link href="/legal/privacy">privacy notice</Link>.
            </p>
          </details>
        </div>
      </section>
    </PublicShell>
  );
}
