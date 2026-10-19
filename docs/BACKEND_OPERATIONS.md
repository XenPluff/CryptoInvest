# Backend operations and financial posting

The API is Express 5 with a Rust-free Prisma 6 client and PostgreSQL. `server/app.ts` exports an application without opening a port or starting background jobs; `server/index.ts` owns the listener and durable activity-email worker.

## Installation and migrations

Run `npm ci`, `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` using the configured environment. The `scripts/generate-client.mjs` helper invokes Prisma's own WASM schema parser and official client generator. It avoids downloading an unnecessary native engine; signature, checksum, and TLS verification remain enabled. `scripts/migrate.mjs` applies the checked-in SQL migrations under a PostgreSQL advisory lock and transaction, records standard `_prisma_migrations` checksums, and refuses modified or unfinished migration histories. An already-applied migration must never be edited. Use a new migration for schema changes. PostgreSQL tables use the `public` schema.

Seed data comprises only the five supplied investment plan definitions and six supplied public deposit addresses. It creates no accounts, deposits, balances, profits, testimonials, or market history. Re-running the seed preserves operator edits. These deposit addresses are user-supplied; no custody ownership or external account linkage is established by seeding them.

Create an initial administrator with securely supplied `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`, then run `npm run admin:create`. The password must have at least 14 characters and no more than 72 UTF-8 bytes. Existing accounts are never overwritten or automatically promoted. Sign in, open account security, and enroll an authenticator. Every admin API requires enrolled two-factor authentication. Financial reviews, identity review, funding switches, and custody connectivity checks additionally require a current six-digit code. Provision two separate administrator identities for payout dual control.

## Account security

JWT cookies are HTTP-only, SameSite=Lax, and Secure in production. Each JWT is tied to a database session containing a token hash, expiry, and revocation state. Password reset revokes every existing session. Disabling or enabling TOTP revokes other sessions. Session creation locks the user row and rechecks credential state to close races with resets or security changes. Passwords use bcrypt with cost 12 and reject inputs beyond bcrypt's 72-byte limit.

Passkeys use WebAuthn with required user verification, the exact configured origin, and its hostname as RP ID. Enrollment and removal require current TOTP when enrolled, otherwise the current password. Challenges are single-use, expire after five minutes, and become unusable when password, TOTP, or suspension state changes. Login assertions verify the actual stored public key; signature-counter persistence, credential revocation checks, and session issuance share the user security lock. TOTP remains required for accounts that have enrolled it. A public HTTPS domain is required for deployed browsers; localhost supports local development. Changing domains changes the RP ID and requires enrolling new credentials for that domain.

Verification and password reset links contain cryptographically random single-use tokens; only hashes are stored. Verification expires after 24 hours and reset after one hour. Tokens are never returned by API registration/reset requests. Email verification and reset require a working delivery provider. Set `APP_ORIGIN` to the exact frontend origin; production requires HTTPS. Every state-changing API requires JSON and a matching Origin header. Keep the API behind the frontend's same-origin `/api` proxy. Authenticated and auth responses use `Cache-Control: no-store`.

Identity forms store sensitive full name, date of birth, and document number together as authenticated AES-256-GCM ciphertext under `KYC_ENCRYPTION_KEY`. Country, document type, review status, and timestamps remain queryable. Retain and back up this key securely: losing it prevents decryption. The form and operator review store metadata; no external identity-document, sanctions, AML, or source-of-funds provider integration is claimed. Implement the legally approved verification and retention procedure before accepting funds.

## Financial controls

`FUNDING_ENABLED` defaults to false. The dashboard cannot override a false deployment flag. When the flag is true, administrators can still pause financial activity through `/admin/settings`. Every user financial submission requires verified email, approved identity review, and valid TOTP. Market prices and live growth estimates do not credit the ledger.

Available USD balances are sums of signed integer-cent `LedgerEntry` rows. The database rejects UPDATE and DELETE on ledger and audit rows. Reconciliations must be new compensating entries. Use a least-privilege application database role which does not own tables/triggers in production; database owners and superusers can defeat SQL-level protections. Back up the ledger and audit history, restrict database administration, and reconcile with external custody records.

Concurrent money operations execute in SERIALIZABLE PostgreSQL transactions with bounded retries on serialization conflicts. An investment or withdrawal can debit only an available balance. Unique reference/kind pairs prevent duplicate posting; deposit/payout hashes are unique and normalized per network. Bitcoin, TRON, and EVM hashes are canonicalized consistently; Solana signatures preserve case. Repeated review attempts return a conflict. This is not a blockchain node, signing service, or custody engine.

### Deposits

A user submits a supported wallet, declared USD amount, and external transaction hash. This creates a pending record and never credits available funds. The USD amount is a declaration, not an automatic crypto conversion.

Approval requires all of:

- A current operator TOTP code.
- `confirmedAmount`: the independently reconciled USD value.
- `verificationReference`: an external reconciliation reference of at least 8 characters.
- `ownershipEvidence`: at least 20 characters documenting independently established claimant/source-wallet attribution.
- `note`: at least 15 characters documenting chain, destination, asset, confirmations, and valuation/reconciliation decisions.

A public hash to a shared deposit address does not prove the claimant sent the funds. Before enabling funding, establish an approved attribution procedure or implement per-user custody address mapping and source verification. The operator must independently verify the actual asset/contract, exact destination/network, confirmation depth, reorganization risk, and exchange valuation. No generic blockchain explorer lookup performs this review. Administrators cannot approve their own deposits.

### Withdrawals

A request immediately reserves the exact USD amount with a negative ledger entry. A rejection restores that reserve exactly once. Approval changes review state and does not send a transfer. A separate custody execution process must independently verify the destination and USD-to-asset amount, fees, asset contract/network, and required approvals.

After the external payout, a second administrator must use `action: paid` with the verified transaction hash, note, and TOTP. The approving administrator cannot mark the same withdrawal paid. The API does not broadcast transfers. No private key or seed phrase should be supplied to it. Amounts in records and PDFs are USD ledger values; an external payout's cryptocurrency quantity is reconciled by the operator.

### Investments and maturity

Investments retain snapshots of plan name, slug, duration, and rates. Later plan edits do not alter active investments. Creating an investment moves available funds into allocated principal; it does not create earnings.

The live display is a linearly prorated target estimate capped at the plan duration, following the supplied per-second formula. Exact rational arithmetic produces floored micro-dollar strings for six-decimal display and separate floored integer-cent fields. A $100 Starter target displays $100.000028 after one second and $100.000057 after two seconds; its cent fields remain $100.00 at those times. The display freezes at maturity. These additional digits are illustrative precision, never settled funds. Despite the requested component name, the formula is simple accrual rather than daily compounding. Estimates are not realized or withdrawable. No timer, cron, browser animation, or request automatically posts target returns; actual ledger entries remain integer cents.

At maturity, an authorized operator can call `POST /api/admin/investments/:id/settle` with `principalReturned`, `realizedEarnings`, `externalReference`, `note` (at least 30 characters), and `code`. Independently reconciled actual proceeds must back this posting. Returned principal may be below the original principal to record losses, and realized earnings may be zero. This endpoint must not be used to post arbitrary target estimates. Settlement posts immutable principal/earnings entries and settles once. Operators cannot settle their own investments. There is no implemented external strategy, yield source, or automatic maturity payout.

Referral links associate new registrations with a direct referrer. Commissions/history remain empty until a funded commission-posting process is implemented. No automatic 10% or multi-level commission allocation runs. Do not describe estimated or unimplemented referral entitlement as withdrawable earnings.

## Email and supplied deposit wallets

Resend HTTPS is selected when `RESEND_API_KEY` and an approved `EMAIL_FROM` are configured. SMTP is available with `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and optional paired `SMTP_USER`/`SMTP_PASSWORD`. Use production TLS; verification is never disabled. Local development can use the bound Mailpit SMTP sink, which captures messages for inspection and does not deliver to real inboxes.

Financial and identity events create in-app notifications and durable email-outbox rows in the same database transaction. The API process claims up to ten due messages every 30 seconds using SKIP LOCKED leases, then sends outside financial transactions. Failed jobs retry with exponential backoff up to ten attempts; abandoned leases expire after five minutes. Provider outages do not reverse financial entries. Delivery is at least once: a crash after provider acceptance but before database acknowledgement can duplicate an email. `/api/admin/email-delivery` reports pending, accepted, and exhausted counts. Provider acceptance is not proof of inbox delivery. Monitor exhausted jobs and provider delivery webhooks in production.

Deposits go directly to the six supplied public wallet addresses stored in the wallet catalogue. `/api/wallets` exposes active destinations to signed-in investors, and `/api/admin/providers` shows the same active destinations to administrators alongside email status. No external deposit-provider API key or connection check is required. The operator verifies each transfer and claimant before approving a one-time ledger credit. Payouts remain manually executed and independently reconciled.

Verified-email users can link an injected EVM browser wallet using an actual EIP-191 signature of a server-generated message. The message binds origin, account, chain, nonce, expiry, and the current application session; it explicitly authorizes only linking. The challenge can be consumed once, and an address cannot belong to two accounts. MetaMask, Coinbase Wallet, and compatible injected EIP-1193 providers are supported. This does not implement the separate WalletConnect QR/mobile relay protocol, perform crypto login, or transfer funds. Unlinking requires current TOTP.

## Publishing, newsletters, and analytics

Administrators can create text publications as drafts and explicitly publish or archive them using current TOTP. Only published articles, announcements, and FAQs are exposed by public routes. Published entries must return to draft before editing. Content bodies are rendered as text, and every administrative transition creates an audit entry.

Newsletter subscription requires explicit consent followed by an expiring confirmation email. Existing pre-confirmation subscriber records remain unconfirmed. Confirmation and unsubscribe URLs show a page; only a deliberate POST consumes their tokens. Subscriber records store token hashes, and the unsubscribe token is encrypted for use in future newsletters. The delivery outbox necessarily contains the actual confirmation/unsubscribe action links, so restrict access and retention for the outbox and its backups.

Campaigns are drafts until an administrator enters current TOTP and explicitly queues a batch of at most 100 confirmed subscribers. Each campaign/subscriber pair is unique, allowing safe repeated batch requests without duplicate recipients. The delivery worker rechecks consent, token freshness, cancellation, and campaign status immediately before handing a message to the provider. Unsubscribe and campaign archive cancel pending jobs; already accepted messages cannot be recalled. The small interval between a final eligibility check and provider handoff is not an atomic transaction with the external provider. Configure provider delivery monitoring and a legally approved sender/address/consent policy before public marketing.

Investor and administrator analytics use repeatable-read database snapshots, immutable ledger timestamps, actual active principal, and reconciled settlements. Financial amounts remain integer USD cents. CoinGecko market quotes separately support USD, EUR, and GBP with isolated caches; changing quote currency never converts the USD ledger. Net funding is not platform revenue, and no estimated target returns or synthetic history enter account analytics.

## Validation

`npm test` runs investment, analytics, and provider/security tests; database integration tests are skipped unless `TEST_DATABASE_URL` is supplied. The preferred real database command is `node scripts/test-integration.mjs`: it reads the configured application connection without printing credentials, creates a new randomly named disposable `_test` database, applies every checked-in SQL migration in order, runs the API/ledger suite, and removes only that database afterward. The database role needs CREATE DATABASE permission. Production mode is refused, and application data is never reset.

For manual `TEST_DATABASE_URL` use, select a disposable database whose name ends in `_test` and differs from the configured application database name. Integration tests deliberately recreate its `public` schema; never select application or production data. The suite checks real PostgreSQL concurrency, evidence/TOTP requirements, duplicate posting/refund/settlement prevention, losses and actual earnings at maturity, immutable ledger triggers, sessions and CSRF/RBAC, wallet signature/session/replay boundaries, passkey challenge isolation, consent/publication controls, encrypted identity data, funding pause, dual-operator payout reconciliation, reset-token single use, and transactional email delivery to a local sink.

Production launch still requires external custody execution and deposit attribution, approved identity/AML checks, actual investment strategy and reconciliation, operator/legal content, monitored production email, independent security review, backup/restore testing, and deployment credentials. WalletConnect QR/mobile relay, SMS/push, live chat, and automatic multi-level commission allocation are not implemented by this API.

## Enabled funding and administrator balance operations

Funding in the current workspace was explicitly enabled by the owner. Preserve the environment gate and database setting; `/api/admin/settings` allows authenticated administrators with current TOTP to pause or resume funding. A pause is not overwritten on startup. New installations still default to disabled funding unless configured.

Balance credits and debits are new `ADJUSTMENT` records and signed `ADMIN_CREDIT`/`ADMIN_DEBIT` ledger entries. Each request includes a UUID, reason, and supporting reconciliation reference. Repeated request IDs cannot post again; debits are checked in a serializable transaction against available funds. Administrators cannot adjust their own account. Corrections do not rewrite immutable entries or count as investment returns or verified deposits.

`BalanceTransfer` tracks internal USD transfers. Creation reserves the sender balance with `TRANSFER_RESERVE`; approval posts one `TRANSFER_IN`, while declining posts one `TRANSFER_REFUND`. Eligibility is checked both at creation and approval. Sender and recipient cannot be the same account or the acting administrator. Serializable review and unique ledger references prevent competing approvals/declines from double crediting or refunding. Two transaction records describe a completed transfer, with CREDIT/DEBIT directions; only the sender has a pending record before approval. External cryptocurrency transfers still use the actual payout and separate reconciliation flow.
