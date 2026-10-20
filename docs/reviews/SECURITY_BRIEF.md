# Request for independent application security review

Status: draft for scoping and quotation. No testing authorization, provider
selection, fee agreement, or completed independent audit is represented here.

## Product and objective

AUREON is a Next.js 15 / React 19 frontend with an Express 5 API, Prisma 6 and
PostgreSQL 17. The Docker runtime uses Node 22, with a web service and managed
database on Render. Assess the exact deployment and source revision agreed at
engagement start, including dependencies, infrastructure configuration, and the
independent GitHub Actions monitor. Request a source-assisted application/API
assessment and financial business-logic review; a smart-contract-only audit or
automated scanner report will not cover this product.

Investors authenticate using verified email, passwords, TOTP and optional
passkeys. Transactions use a USD-cent ledger. Crypto deposits go to six supplied
shared receiving destinations; an administrator manually verifies the transfer,
claimant and USD valuation before crediting. Withdrawals reserve recorded funds;
external payment and reconciliation are manual. Administrators can post audited
credits/debits, initiate internal transfers, review requests, and settle actual
investment proceeds. The application does not store cryptocurrency private keys
or broadcast payments, and does not include an investment execution engine.

## Required assessment coverage

| Area | Questions and abuse cases to test |
| --- | --- |
| Identity/session security | Registration and recovery enumeration, token expiry and single use, session revocation, cookie/origin controls, TOTP enrollment/disable, proof freshness/replay, brute-force limits and administrator provisioning |
| Passkeys and wallet proofs | Origin/RP ID, challenge expiry and isolation, credential ownership, signature/counter behavior, replay, changed account security state, and retained TOTP requirements |
| Authorization | Investor-to-investor isolation; role and suspension changes; object-level access to identities, statements, transactions, backups and administration; sensitive mutations after session or role revocation |
| Financial integrity | Concurrent spending, reservation/refund invariants, integer-cent bounds, duplicate references, retry behavior, forbidden status transitions, self-dealing, separation of operator duties and adjustment evidence |
| Deposit attribution | Reused/unrelated public hashes, wrong asset/token contract, network, destination, finality, claimant identity and valuation; determine whether the actual manual procedure prevents miscrediting shared-wallet transfers |
| Withdrawals/transfers | Destination substitution, approval/payment reconciliation, replay and concurrency, reservation release, rejected or repeated decisions, and changes to recipient eligibility |
| Estimates and settlement | Illustrative counters must never create withdrawable funds; test maturity, losses, operator inputs, actual-proceeds evidence and immutable investment snapshots |
| Sensitive data | KYC/authenticator encryption, key/nonce use, redaction, access logs, secrets in responses/builds/errors, retention/deletion and least-privilege database access |
| Backups/recovery | Browser-only recovery-key handling; public-key validation; authenticated archive bounds and metadata; snapshot consistency; download authorization/caching; worker concurrency; read-back integrity; private bucket/lifecycle configuration and empty-target restore safeguards |
| Operations and email | Queue leasing, priority and retries, notification recipients after role changes, alert acknowledgement/deduplication, stored content/template injection, newsletter consent, external-link validation and degraded-provider behavior |
| Hosting/supply chain | Docker privilege boundaries, exposed services, TLS, origin/proxy trust, dependencies and lockfiles, migrations, secret management, CI permissions and pinned actions, resource exhaustion and process-local rate limits |

Use OWASP ASVS Level 2 and current web/API testing guidance as a proposed
baseline, with explicit additional financial-integrity cases. Have the reviewer
state the versions, scope, exclusions and testing depth in its proposal; mapping
to a checklist alone is not certification.

## Access and rules of engagement

- Default target: a separately provisioned staging deployment and disposable
  database with synthetic accounts, identities and ledger records. The current
  preview URL is inventory information, not permission to test production.
- The legal owner and reviewer must sign a scope defining hostnames, IPs,
  environment, dates, techniques, rate/concurrency limits, incident contacts,
  stop conditions, confidentiality, evidence retention and provider terms.
- Provide dedicated investor and administrator accounts, including separate
  operator roles needed to test payout reconciliation. Reviewers enroll their
  own authenticators. Never share the owner's password, TOTP seed/codes,
  primary administrator session, wallet private keys or backup recovery key.
- Give source read access and explicitly approved, least-privilege configuration
  evidence through a private review channel. Do not hand out deployment master
  keys, broad cloud tokens or unredacted environment dumps by default.
- Capture email locally or in an approved test inbox. Use synthetic chain
  fixtures or an agreed test network for transfer evidence; no real transfers,
  settlements, unsolicited mail, social engineering or destructive load tests.
- Render, Brevo, Cloudflare, GitHub, CoinGecko, blockchain infrastructure and
  unrelated tenants are not authorized attack targets. Configuration review
  does not authorize probing those providers' infrastructure.
- Production testing, if later necessary, needs separate written permission,
  a provider-compatible scope, monitoring and explicit emergency procedures.

## Deliverables and quote request

Request named reviewers, relevant web/API and financial-integrity experience,
independence/conflict confirmation, proposed person-days, price/currency/taxes,
start availability, remediation support, a priced/included retest and exclusions.
Agree security/data-handling terms and evidence deletion before access.

Require an executive report and private technical findings with affected
revision/environment, severity and reasoning, reproducible evidence, exploit
preconditions, remediation guidance, coverage and limitations. Retest material
findings independently and report fixed, unresolved, accepted and untested items
separately. The owner should not broaden launch while critical/high findings
remain unresolved without a documented decision informed by the reviewer.

The development test suite and backup restore drills are supporting evidence,
not the independent review requested here. Existing documented operational gaps,
including production off-site storage and formal deposit-attribution procedures,
must be assessed rather than assumed resolved by successful local tests.
