# AUREON API contract

API paths are prefixed `/api`. Amounts are USD decimal numbers unless suffixed `Cents`; all posted ledger amounts are integer USD cents. Rate fields are fractions (`0.025` means 2.5%). Errors are `{error:string}`. Auth uses an HTTP-only session cookie backed by revocable database sessions. Mutations require JSON and an Origin matching APP_ORIGIN. Sensitive responses use `Cache-Control: no-store`. Never fabricate funds, users, prices, provider connectivity, custody ownership, commissions, or return history.

## Public and authentication

The [pre-launch card API](../docs/CARD_PROGRAM.md) provides authenticated
`GET /cards`, `POST /cards/applications`, owner-only withdrawal, and
admin-only `/admin/card-applications` list/review routes. It issues no cards,
approves no credit and changes no financial balances.

- `GET /health` → `{status,database,emailConfigured,emailDeliveryStatus,fundingEnabled}`;503if database unavailable. `emailDeliveryStatus` is a cached, read-only provider check from the deployed network, refreshed at startup and every 15 minutes. It does not prove inbox delivery and contains no credentials or provider response bodies.
- `GET /plans` → `{plans:[{id,name,slug,dailyRate,monthlyRate,minAmount,maxAmount,durationDays,description,active}]}`; only active plans.
- `GET /markets?currency=USD|EUR|GBP` → `{assets:[{id,symbol,name,price,change24h:number|null}],currency,updatedAt,source,stale}`. Defaults to USD. CoinGecko supplies the selected quote currency; each currency has its own 60-second cache and 15-minute stale limit. Unsupported currencies return 400; no usable provider data returns 503. Null change24h means unavailable. Account balances remain USD.
- `POST /contact {name,email,subject,message}` stores an operator support message.
- `POST /newsletter {email,consent:true}` → 202 `{message}`. Stores explicit consent and queues a confirmation email; it does not activate a subscription. No confirmation tokens are returned in the response.
- `POST /newsletter/confirm {token}` activates consent through a single-use, expiring hashed token. `POST /newsletter/unsubscribe {token}` withdraws consent and cancels pending newsletter messages; repeat unsubscription succeeds. GET requests never consume these tokens.
- `GET /content?kind=ARTICLE|ANNOUNCEMENT|FAQ&limit=20` → `{entries:[]}`; limit is an integer from 1 to 50. Only published content appears. `GET /content/:slug` → `{entry}` including its body, or 404 for drafts/archives.
- `GET /auth/me` → `{user:{id,name,email,role,emailVerified,kycStatus,twoFactorEnabled,referralCode}}`;401if signedout.
- `POST /auth/register {name,email,password,referralCode?}` → `{message}`. Real email delivery required; no tokens returned. Password12min,128max,72UTF8bytes max.
- `POST /auth/login {email,password,code?}` → `{user}` or `{requiresTwoFactor:true}`. Does not issue a session until enabled TOTP is verified.
- `POST /auth/logout {}` revokes the session.
- `POST /auth/verify-email {token}`; `POST /auth/resend-verification {email}`.
- `POST /auth/forgot-password {email}`; `POST /auth/reset-password {token,password}`. Single-use hashed tokens; successful reset revokes all sessions.
- `POST /auth/2fa/setup {}` → `{secret,otpauthUrl}`; verified email required. Provisioning secret is returned only for enrollment and encrypted at rest.
- `POST /auth/2fa/enable {code}`; `POST /auth/2fa/disable {code,password}`.
- `GET /auth/passkeys` → `{credentials:[{id,label,deviceType,backedUp,createdAt,lastUsedAt}]}` for the signed-in account.
- `POST /auth/passkeys/register/options {password?,code?}` → `{options,challengeId}`. Investor credential changes use the current password; administrator credential changes use current TOTP. `POST /auth/passkeys/register/verify {challengeId,response,label}` completes WebAuthn enrollment with required user verification. Challenges are single-use, expire after five minutes, and bind the account, session, origin, RP ID, and security state.
- `POST /auth/passkeys/login/options {email}` → `{options,challengeId}` without disclosing registered credential IDs or account existence. `POST /auth/passkeys/login/verify {challengeId,response,code?}` → `{user}` and a revocable session after real signature verification. Enrolled TOTP remains required. Credential revocation/counter updates and session creation share a locked security check.
- `DELETE /auth/passkeys/:id {password?,code?}` removes an owned credential after reauthentication. Passkeys require browser WebAuthn support and a secure origin, or localhost during development.

## Investor workspace

All routes require auth. Financial routes additionally require deployment funding enabled and verified email. Identity approval is optional for deposit quotes and submissions; investment subscriptions and withdrawals require approved KYC. Investor TOTP enrollment is optional. Deposits and investments never request a code; withdrawals require a valid code only when the account is enrolled, rechecked under the User lock. Funding defaultsfalse; server returns503until explicitly configured. Submitting a hash never auto-credits funds, and approving a withdrawal never sends cryptocurrency.

- `GET /dashboard` → `{balance,invested,totalEarned,summary,generatedAt,referralEarnings,investments:[],transactions:[],notifications:[],user}`. Balance is available USD; totalEarned contains only reconciled realized earnings.
- `GET /wallets` → `{wallets:[{id,asset,network,address}],fundingEnabled}`. Addresses are supplied by the operator; no external custody assertion.
- `GET /wallet-connect/links` → `{links:[{id,address,chainId,provider,verifiedAt}]}`. These wallet-link routes require verified email.
- `POST /wallet-connect/challenge {address,chainId,provider}` → 201 `{challengeId,message,expiresAt}`. Provider is `MetaMask`, `Coinbase Wallet`, or `Browser wallet`; addresses are EVM accounts. `POST /wallet-connect/verify {challengeId,signature}` verifies an actual EIP-191 ownership signature. Challenges bind account, session, origin, chain, nonce, and expiry; duplicate ownership claims and replay return 409. Linking never transfers funds or creates available balance.
- `DELETE /wallet-connect/links/:id {}` unlinks an owned connection using the authenticated session and ownership checks.
- `GET /transactions` → `{transactions:[{id,type,amount,status,asset,network,txHash,address,note,createdAt}]}`; latest500records.
- `GET /deposit-price?asset=BTC|ETH|USDT|BNB|SOL` → `{price:{asset,priceUsd,source,updatedAt,expiresAt}}`. Authenticated current USD spot price, briefly cached for 25 seconds. Coinbase is primary; timestamp-checked CoinGecko is the alternate. Both unavailable returns 503, never a synthetic or assumed stablecoin price.
- `POST /deposits/quote {walletId,amount}` → `{quote:{walletId,asset,network,address,amountCents,cryptoAmount,priceUsd,source,updatedAt,expiresAt,quotedAt,quoteToken}}`. Requires authentication, verified email and enabled funding; identity approval is optional, without investor MFA. Amount is USD. Integer arithmetic rounds the coin figure up to transferable precision. Signed instructions bind the investor, USD amount and exact destination. The payment window freezes the coin amount; this is an indicative conversion, not a guaranteed USD settlement rate.
- `POST /deposits {walletId,amount,txHash,quoteToken?}` → `{deposit}`. The new UI supplies its signed instructions; the optional token preserves compatibility with older clients. If present, its signature, owner, amount and current wallet mapping must match. A quote is reportable for seven days so returning from a wallet does not require changing payment details after sending. Captured pricing/coin details are recorded in the pending transaction note. Amount is declared USD; pending until independent valuation, on-chain verification, and claimant attribution. Hash format is network-specific and canonicalized; duplicate references return409. No investor MFA or balance credit occurs on Done.
- `POST /withdrawals {amount,asset,network,address,code}` → `{withdrawal}`. Immediately reserves USD balance; requires manual approval, external payout, and independent reconciliation.
- `POST /investments {planId,amount}` → `{investment}`.
- `GET /investments` → `{investments:[],summary,totalEarned,generatedAt}`. Both portfolio endpoints use one shared read in a repeatable-read database snapshot. `summary` contains integer-cent `activePrincipalCents`, `realizedEarningsCents`, `principalReturnedCents`, and counts `activePositions` / `settledPositions`. Posted ledger entries determine earnings and returned principal; the legacy earnings cache is not authoritative.
- Investment shape: `{id,planName,planSlug,principalAmount,startTimestamp,durationDays,dailyRate,monthlyRate,status,earnedAmount,earnedCents,principalCents,principalReturned,principalReturnedCents,settledAt}`. Plan terms are snapshots. `earnedAmount` is realized, posted income only. Live target estimates are separate and never withdrawable. ACTIVE investments may receive separately verified profit credits before maturity; principal remains invested until final reconciliation. Mature positions remain ACTIVE until their verified final settlement is posted.
- `POST /kyc {fullName,country,dateOfBirth,documentType,documentNumber}` → `{message}`. Email verification and valid18+birthdate required; sensitive fields encrypted. Supported canonical documentType values: `passport`, `national_id`, `drivers_license`. No external identity/AML verification claimed.
- `GET /kyc` → `{kyc:null|{id,status,country,documentType,reviewNote,createdAt,reviewedAt}}`; sensitive submitted identifiers are not echoed.
- `PATCH /profile {name}` → `{user}`.
- `GET /referrals` → `{referralCode,referrals:[{id,name,createdAt}],commissions:[],totalEarned,commissionPolicy}`. Direct registration attribution only; automatic or multi-level commission posting is not implemented.
- `GET /notifications` → `{notifications:[{id,title,message,readAt,createdAt}]}`; `POST /notifications/read {}`.
- `GET /statements` downloads a PDF of recorded USD transactions and available balance; it does not certify external custody or projected returns.
- `GET /analytics` → `{currency:'USD',generatedAt,summary,history,allocation,settlements}`. Every amount is an integer-cent field ending in `Cents`. History uses recorded ledger timestamps, allocations use active principal, and settlements use reconciled principal/earnings. Empty accounts have empty history; no synthetic performance points are generated.

## Administration

All routes require ADMIN role and enrolled2FA. Financial reviews, settlement, KYC review, funding changes, additionally require a current `code` in the JSON body. Financial postings require deployment funding enabled. Administrators cannot approve their own deposits, withdrawals, identity submissions, or investment settlements.

- `GET /admin/overview` → `{totalUsers,activeInvestors,totalDeposits,totalWithdrawals,pendingDeposits,pendingWithdrawals,pendingKyc,users:[],transactions:[],auditLogs:[]}`. Deposits include approvedUSD; withdrawals include paidUSD only.
- `GET /admin/users` → `{users:[]}`; `PATCH /admin/users/:id {suspended?,name?}`. Suspension revokes sessions. Role/credentials/admin-account elevation are excluded.
- `GET /admin/deposits` → `{deposits:[]}`; `GET /admin/withdrawals` → `{withdrawals:[]}`. Rows include transaction fields plus `user:{id,name,email}` and optional wallet.
- `POST /admin/deposits/:id/review {action:'approve'|'reject',confirmedAmount?,code,note?,ownershipEvidence?,verificationReference?}`. Approval requires confirmed USD amount and a current admin code; decline requires the decision and code. The review UI omits evidence-reference, ownership-evidence and review-note fields. If no note is supplied, the server records the factual administrator decision, reviewer and timestamp; it does not invent verification evidence. Optional legacy evidence/note values remain accepted and audited when supplied (note15charsmin, ownershipEvidence20charsmin, verificationReference8charsmin). A public transaction hash alone does not establish claimant ownership.
- `POST /admin/withdrawals/:id/review {action:'approve'|'reject'|'paid',note,txHash?,code}`. Note15charsmin. Approve only fromPENDING; reject fromPENDING/APPROVED and refundonce; paid only fromAPPROVED with verified hash and a different administrator than the approver.
- `GET /admin/investments` → `{investments:[]}` including user details.
- `POST /admin/investments/:id/settle {principalReturned,realizedEarnings,externalReference,note,code}`. Only mature ACTIVE investments. Nonnegative actual proceeds, returned principal≤original; earnings may be0. Note30charsmin, externalReference8charsmin. Posts reconciled principal and earnings exactlyonce. No automatic yield generation or target-return posting.
- `POST /admin/investments/:id/verify-settlement {kind:'PROFIT'|'FINAL',principalReturned,realizedEarnings,externalReference,note,verified:true,code}` → 202 durable verified record. Requires enabled automatic settlement, funding and current admin TOTP. PROFIT requires positive additional income and zero principal; FINAL requires maturity, bounded principal and no queued profit records. Worker posts exact verified proceeds once. Evidence references are unique per investment. Portfolio reads/analytics include all periodic credits; target counters do not authorize posting. See [automatic settlement](../docs/AUTOMATIC_SETTLEMENT.md).
- `GET /admin/kyc` → `{submissions:[]}`. Authorized decrypted form metadata plus `id,userId,status,reviewNote,createdAt,user`.
- `POST /admin/kyc/:id/review {action:'approve'|'reject',note,code}`; note10charsmin; pending submissions only.
- `GET /admin/plans` → `{plans:[]}` including inactive plans.
- `POST /admin/plans {name,slug,dailyRate,monthlyRate,minAmount,maxAmount,durationDays,description,active}`; `PATCH /admin/plans/:id` accepts the same optionalfields. Rates cannot simultaneously be positive; min/maxmust be consistent. Existing investment snapshots remain unchanged. Setactivefalse to archive; financial history is never deleted.
- `GET /admin/audit` → `{logs:[]}`; `GET /admin/messages` → `{messages:[]}`.
- `GET /admin/settings` → `{fundingEnabled,fundingConfigured,emailConfigured}`.
- `PATCH /admin/settings {fundingEnabled,code}`. Cannot turnon unless deployment FUNDING_ENABLED=true.
- `GET /admin/providers` → `{email:{provider,configured,connectionVerified,lastAcceptedAt},deposits:{method:'provided_wallet_addresses',confirmation:'manual_review',wallets:[{id,asset,network,address}]}}`. Deposit destinations come from active wallet records, matching `GET /wallets`; no external deposit-provider connection is used.
- `GET /admin/email-delivery` → `{pending,sent,failed,cancelled,note}`. Cancelled jobs are excluded from pending/failed counts. Durable email retries up to 10 times; sent means provider accepted, not independently verified inbox delivery. Worker leases up to 10 jobs every 30 seconds; failed delivery never rolls back financial transactions.
- `GET /admin/analytics` → `{currency:'USD',generatedAt,summary,history,allocation}`. Registered investor counts, verified deposits, paid withdrawals, realized earnings, and principal allocations come from actual records. Net funding is not represented as platform revenue.
- `GET /admin/content` → `{entries:[]}` including drafts and archives. `POST /admin/content {kind,slug,title,summary,body}` creates a draft. `PATCH /admin/content/:id` accepts the same complete fields while the entry is a draft. `POST /admin/content/:id/status {status:'DRAFT'|'PUBLISHED'|'ARCHIVED',code}` requires current TOTP and records an audit entry. Bodies are text, never executable HTML.
- `GET /admin/campaigns` → `{campaigns:[],subscriberCounts:{confirmed,pending,unsubscribed},emailConfigured}`. `POST /admin/campaigns {title,subject,message}` creates a draft without sending; `PATCH /admin/campaigns/:id` accepts those complete fields only before queuing.
- `POST /admin/campaigns/:id/queue {confirmation:'QUEUE CAMPAIGN',code,batchSize?}` queues at most 100 eligible confirmed subscribers per call. Current TOTP, configured email, explicit confirmation, and active consent are required. Repeated batches never duplicate the same campaign/subscriber pair. The worker rechecks consent and campaign status before provider handoff and includes an unsubscribe link.
- `POST /admin/campaigns/:id/archive {code}` archives a campaign and cancels pending jobs. Provider-accepted messages cannot be recalled.

See `docs/BACKEND_OPERATIONS.md` for external reconciliation requirements, provider setup, schema migration behavior, and implemented boundaries.

## Administrator balances and internal transfers

Every administrator mutation (including user, plan and draft changes) requires administrator role, enrolled TOTP and a current `code`. Financial mutations below also require enabled funding. Requests cannot target the acting administrator's balance. Existing ledger history is never edited.

- `GET /admin/users` includes each account's available USD `balance`.
- `GET /admin/users/:id/ledger` returns `{balance,entries:[{id,amount,amountCents,kind,referenceId,createdAt}]}` (latest 100 entries).
- `POST /admin/balance-adjustments {userId,direction:'credit'|'debit',amount,externalReference,note,idempotencyKey,code}` returns 201 `{transaction,balance,message}`. Reference is at least 8 characters, note at least 15, key a UUID, amount a positive USD value with at most two decimals. Debits cannot exceed available balance. Reusing a request ID returns 409 without another posting.
- `GET /admin/transactions?type=&status=` returns `{transactions:[]}` with investor details, USD `amount`, and optional `direction:'CREDIT'|'DEBIT'`. Omit empty filters; enum values are validated. Latest 1,000 records.
- `GET /admin/transfers` returns `{transfers:[]}` with sender/recipient details and USD `amount`.
- `POST /admin/transfers {fromUserId,toUserId,amount,note,idempotencyKey,code}` reserves sender funds and creates a PENDING internal USD transfer. Both accounts must be distinct, active, email verified and identity approved. Investor TOTP enrollment is optional.
- `POST /admin/transfers/:id/review {action:'approve'|'reject',note,code}` changes PENDING to SETTLED (credit recipient) or REJECTED (refund sender). Approval rechecks eligibility. Concurrent or repeated decisions return 409 without duplicate credit/refund. These routes never broadcast a blockchain transaction.

## Administrator operations and backups

These routes require an active administrator session and enrolled TOTP. They do
not depend on funding being enabled. Mutations additionally require current
`code`, JSON, and the matching application Origin; results use `no-store`.

- `GET /admin/operations` returns `{alerts,backups,backup,latestVerifiedBackup,monitoring}`. Active conditions precede recent resolved conditions; backup history is capped at 20 runs. The latest verified off-site upload is queried separately. Storage credential values and recovery keys are never returned.
- `POST /admin/operations/alerts/:id/acknowledge {code}` records acknowledgement and an audit event. It does not resolve the underlying condition; stale/already acknowledged conditions return 409.
- `POST /admin/operations/backup-key {code,publicKey,recoveryKeySaved:true}` stores only an RSA SPKI public key of at least 3072 bits and audits its SHA-256 fingerprint. Invalid keys return 400; replacing a configured key returns 409. Private keys are generated/downloaded in the browser and must never be submitted.
- `POST /admin/operations/backups/download {code}` prepares an authenticated encrypted PostgreSQL archive, returning an attachment with `X-Backup-SHA256`. The result records `PREPARED`, not off-site success. It requires prior recovery-kit setup and is limited to three attempts per hour per client IP. No production restore route exists.

Daily off-site runs use database claims and record `SUCCEEDED` only after stored
bytes are retrieved and their size and checksum match. See
[backup recovery](../docs/BACKUP_RECOVERY.md) and
[operational alerts](../docs/OPERATIONAL_ALERTS.md) for setup and limits.
