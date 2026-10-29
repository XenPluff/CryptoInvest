# Transfers without required blockchain transaction hashes

Deposit reporting and administrator payout confirmation no longer have a
blockchain transaction-hash input. After sending, an investor confirms the
transfer in the existing payment window and chooses Done. Amount, network,
receiving address, QR, captured conversion and resumable instructions remain.
Payout marking keeps its review note, current operator TOTP, prior approval and
independent second-administrator reconciliation, without requiring a hash.
Notifications do not claim that a hash was recorded when none was supplied.

Deposit payment instructions now contain a random signed identifier. The server
stores a SHA-256 digest of the instruction token under a nullable unique
`Transaction.depositInstructionKey` constraint. A single set of instructions can
produce only one deposit report, including concurrent/repeated submissions or a
retry that adds different optional hash metadata. Distinct payment instructions
remain possible for the same amount, even at the same timestamp. Signed owner,
wallet, amount and expiry checks continue to apply. The normal UI automatically
supplies the token; there is no new investor-entered reference field.

Hashless API reporting requires signed payment instructions. Legacy clients can
still send an optional hash, including without a quote. Supplied nonempty hashes
are normalized and validated, and their existing uniqueness constraint remains.
Empty/null optional hashes are treated as absent. Previously stored hashes are
not deleted or replaced with invented values. The migration only adds a nullable
instruction-key column/index; it does not backfill or credit transactions.

A report creates a pending deposit. Receipt, confirmations, claimant attribution
and USD value still require operator review. Instruction-token idempotency
prevents repeated reports of those instructions; independent review must still
identify distinct actual transfers before approving funding. Payout status is
recordkeeping after an external payment, not an automated blockchain transfer.
Identity approval remains optional for deposits; email verification and funding
availability still apply. Investment/withdrawal identity requirements and the
verified-profit settlement worker are unaffected.

Deposit side instructions, homepage FAQ, public process copy, the deposit guide
and the getting-started guide match this flow. Both affected MP4s, captions and
transcripts have been regenerated and fully decoded with FFmpeg; the account
clip also reflects optional identity review for deposits. Existing dated company
PDFs and historical transaction statements remain snapshots/records.

Validation: production build/type checks, 170 unit tests, 42 isolated PostgreSQL
checks (29 ledger + 11 MFA + one identity + one hashless-report regression), and
19 local browser cases verified. Coverage includes absent hashes, authenticated
signed quotes, no identity record, per-instruction concurrency/replay rejection,
new unique instructions, pending deposits without credit, payout marking without
a hash, unchanged second-operator checks, ledger reserves, six QR/copy values,
resumed instructions, failure/paused/email states, eight interface languages and
desktop/mobile layouts. Two parallel browser runs initially collided in their
shared trace directory during teardown; the affected QR case passed when rerun
alone with its own artifact directory. No product change was needed for that
verification-tool issue. All real database cases use disposable databases and
local SMTP capture, with no production records or external emails.

Hosted verification and the running source are recorded in
[Live preview](LIVE_PREVIEW.md) and [Validation](VALIDATION.md). Local evidence is
under `.aureon/hashless-transfers/`.

This release is live in deployment `dep-dbh8rluc6qcc73emr4cg`, source
`d40d572c1826ad558d7af8d3e87b65d632f177f3`. Nine hosted deposit/payout cases
pass on deployed HTML/assets with browser-only private records and requests.
The eight local guide files (MP4/poster/captions/transcript for both affected
guides) match deployed SHA-256 hashes. Actual health remains connected with
enabled funding, passed email readiness and an advancing automatic-settlement
heartbeat; unauthenticated account APIs return 401. Verification created no
production deposits, payouts, financial credits or emails. Deployment/health
metadata is in `.aureon/validation/hashless-transfers-*`. Documentation-only
commits do not change this running source automatically.
