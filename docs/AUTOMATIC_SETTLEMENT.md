# Automatic settlement of verified investment proceeds

The operator requested automatic settlement using verified investment profits.
`AUTOMATIC_SETTLEMENT_ENABLED=true` enables a background worker checking every
15 seconds. Default configuration remains disabled outside the activated
service. Funding must also be enabled. Health reports the configured mode,
source (`administrator_verified_profit_records`), interval and last completed
check. No broker/exchange profit feed is connected or implied.

In Admin → Settlements, an administrator with an enrolled authenticator enters
an external evidence reference, verification reasoning and the exact additional
unpaid profit, and explicitly confirms verification. A valid current TOTP is
required. This creates a durable verification record, without immediately
changing available balance. The worker credits the record automatically; there
is no separate manual posting step. This is administrator verification of an
external record, not machine verification of trading statements.

Two record types are supported:

- `PROFIT`: positive verified income while the investment remains active.
  Principal returned must be zero. Credit increases available balance and
  realized earnings; the allocated principal and investment term remain intact.
- `FINAL`: verified principal return and additional unpaid earnings at maturity.
  Principal return cannot exceed the original principal; losses and zero final
  earnings are supported. Previously credited income must not be entered again.
  Existing pending profit records must finish before final verification.

The additive `VerifiedInvestmentSettlement` table starts empty. Existing target
counters or mature positions are never converted into verified records. The
worker does not calculate profits from rates, elapsed time or market prices.
There is no automatic cryptocurrency transfer. Withdrawals retain their normal
review and external payout workflow.

A unique investment/evidence-reference constraint rejects repeat submissions;
a partial unique index allows only one final verification per investment.
Principal remains restricted to final settlement. Serializable transactions,
existing unique ledger references and an atomic `processedAt` update protect
against retries and multiple workers. A failed transaction leaves no partial
ledger credit, investment update, transaction, notification or processed marker.
Queued records survive restarts and retry. Funding pauses block processing and
verification. The verifier must still be an administrator with MFA enabled when
the worker posts the record. The legacy manual endpoint cannot bypass queued
records and retains maturity, evidence and authenticator controls.

Profit-only ledger entries reference the immutable verification ID; final
entries reference the investment ID. Portfolio and analytics reads attribute
all those entries to the investment and sum integer USD cents. Both investor
pages retain their automatic refresh and show the enabled settlement mode.
Settled cards show lifetime proceeds and net result across periodic credits
and the final return, without paying earlier credits twice. Administrator
queue/status reads also refresh automatically.

API additions:

- `POST /api/admin/investments/:id/verify-settlement` accepts
  `{kind:'PROFIT'|'FINAL', principalReturned, realizedEarnings, externalReference,
  note, verified:true, code}` and returns HTTP 202 with the queued record ID.
- Administrator and investor portfolio reads include `automaticSettlement` and
  their authorized investment's verification status. Investor responses exclude
  evidence references, private verification notes and operator details.

Validation includes build/type checks, 169 unit tests, 29 disposable-PostgreSQL
integration checks, and 10 browser cases. The financial checks cover fractional
cents, profit credits before maturity, exact additional final earnings,
repeat-record rejection, concurrent workers, complete rollback on an injected
posting failure, retry, funding pause/resume, operator MFA, actual verification,
nonnegative/bounded principal and portfolio/analytics agreement. Browser
fixtures cover operator profit/final forms, queued/posted states, both investor
views, refresh/failure behavior and desktop/mobile layouts. No production
financial records or external emails are created during verification.

Deployment, activation and hosted verification are recorded in
[Live preview](LIVE_PREVIEW.md) and [Validation](VALIDATION.md).

Live activation is verified in deployment `dep-dbh86pe7bikc73fhic00`, source
`19cede13f0ebc43aa6f1a7bad1bdad132d225dc0`. Render accepted the single-key environment
update, and actual service health reports `enabled:true`, funding enabled and
an advancing worker heartbeat. Eight hosted browser cases pass using deployed
HTML/assets with isolated account/verification fixtures. Actual unauthenticated
investor account endpoints return 401. Database and email readiness remain
passed. Test records and credits were never sent to production; the new live
verification table was not seeded. Validation metadata and logs are in
`.aureon/automatic-settlement/` and `.aureon/validation/automatic-settlement-*`.
Automatic deployment remains disabled; subsequent documentation-only commits
do not replace the running source above.
