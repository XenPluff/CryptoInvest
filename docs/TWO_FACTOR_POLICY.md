# Account two-factor policy

Investors choose whether to enroll an authenticator. Existing preferences are
preserved. An enabled investor must supply a code at password/passkey login and
when requesting a withdrawal. Deposits, investment subscriptions, profile/identity
forms, card applications and wallet unlinking do not request investor codes.
Passkey changes and disabling investor two-factor protection require the current
password. Enrollment itself still verifies one code to confirm the authenticator
was set up correctly.

Withdrawal requests re-read enrollment while locking the account inside the
financial transaction. A client-supplied preference cannot bypass the check, and
enabling an authenticator between authentication and the withdrawal transaction
cannot bypass it. Email verification, enabled funding, destination validation,
available-balance checks and manual transaction reviews remain separate
requirements. Identity approval is optional for deposits; investment subscriptions
and withdrawals still require an approved identity review.

Administrators must enroll and cannot disable protection through account settings.
Password or passkey login must verify TOTP before a full administrator session is
issued. An unenrolled administrator receives a ten-minute, enrollment-only
session: only account identity, authenticator setup and confirmation are allowed.
Completing enrollment replaces that session after verifying the first code.
The original password/security snapshot and session validity bind this handoff.

Every administrator mutation passes the common role and current-code guard,
including changes to investor accounts, plans, drafts, publications, campaigns,
card reviews, operations, transfers, funding and transaction decisions. Read-only
navigation and viewing records do not require entering another code. Common
administrator forms add a required code field when one is absent, preserve it
through field transforms and clear it after a request. Draft validation removes
the verified proof before persisting content.

The signed session token records MFA completion and enrollment-only scope.
Previously issued administrator sessions without the new MFA claim must sign in
again. Investor sessions and stored preferences are preserved. No database schema
or receiving-address change is required.

The account, deposit and withdrawal guide MP4s, English captions and downloadable
transcripts are regenerated alongside current page copy. The existing dated PDF
edition remains a historical product snapshot; current website terms and account
records take precedence, as described in that publication.

Validate with the dedicated disposable-database suite:

```sh
NODE_ENV=development node scripts/test-integration.mjs --two-factor
```

The suite tests investor choice, login challenges, conditional withdrawals,
enrollment races, unchanged financial gates, password opt-out, mandatory admin
proof across mutation families, restricted setup sessions and rejected legacy
administrator sessions. Browser cases in `tests/e2e/two-factor-policy.spec.ts`
use request fixtures, never real investor transactions or production accounts.
