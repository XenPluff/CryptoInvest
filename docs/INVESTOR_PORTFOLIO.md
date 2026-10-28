# Investor portfolio and realized earnings

My Investments now presents lifetime posted earnings, active principal, returned
principal and settled-position totals. Investors can filter active/settled
positions and search by plan name or reference. Each active position retains
its illustrative live target; each settled position shows posted principal,
earnings, total proceeds and net result, including any principal loss. Started,
term-end/settlement dates and expandable references provide context. Mature
active positions are explicitly awaiting settlement. Target counters do not
continue on settled positions.

Both `/api/dashboard` and `/api/investments` use
`server/investor-portfolio.ts` within repeatable-read database transactions.
The same authenticated user's `REALIZED_EARNINGS` ledger entries determine
per-position earnings and portfolio totals in integer USD cents. Returned
principal uses separate `PRINCIPAL_RETURN` entries. Available balance still
comes from the ledger; referrals remain a separate category. A stale legacy
`earnedCents` investment cache cannot inflate or suppress displayed earnings.
No migrations, rate changes, backfilled earnings, automatic settlement, wallet
changes or production ledger writes are included.

Overview, My Investments and portfolio analytics refresh every 15 seconds while
visible and online, and when focus/connectivity returns. Requests do not overlap,
time out after 20 seconds and abort on unmount. Background refreshes preserve
content and selected filters. Temporary failures retain the last successful
amounts with a stale-data notice and timestamp on the main portfolio views;
authorization failures remove private data. Initial-error retries restore the
loading state before attempting to render account data. Manual refresh is
available on both main pages. Independent requests can observe different
settlement times until the next refresh; each response is internally consistent.

Realized earnings increase when actual reconciled income is posted by the
settlement workflow. The subsequent [automatic-settlement release](AUTOMATIC_SETTLEMENT.md)
adds administrator-verified periodic profit credits and automatic final posting. Elapsed time alone does not post earnings or
make projected targets withdrawable. Existing evidence, maturity, administrator
TOTP, audit and exactly-once settlement controls remain in place.

Validation: production build/type checks; 169 unit tests; all 26 PostgreSQL
integration checks in a separate disposable database with local SMTP capture;
six portfolio browser cases plus two existing live-growth cases. Browser
fixtures test automatic updates on both pages, preserved filters, per-position
sums, search/empty states, failed refresh/recovery, initial-error retry, hidden-tab
pause/resume and clearing private values after authorization failure. English/
Arabic layouts fit 1440/768/390/320px; original six-decimal target counters and
maturity caps remain verified. Financial integration checks cover fractional
cents, endpoint/analytics agreement, stale caches, cross-user isolation and
repeated-settlement rejection. Initial runs caught a refresh rendering bug
(fixed before passing browser reruns) and a missing local SMTP capture service
(restored before the clean integration rerun). Local checks create no production
records or emails. Hosted checks and running source are recorded in
[Live preview](LIVE_PREVIEW.md) and [Validation](VALIDATION.md).

The release is live in Render deployment `dep-dbh7cn7lk1mc73an6log`, source
`e5aa6bd281c7893dcb8203d082f4c266dc725941`. All six hosted portfolio browser cases
pass against deployed HTML/assets using isolated private-account responses,
with no production financial writes. Actual unauthenticated portfolio/dashboard/
analytics APIs return 401. Health reports connected database, enabled funding
and passed email readiness. Hosted screenshots and logs are stored with the
local evidence under `.aureon/portfolio/`. Automatic deployment remains disabled;
subsequent documentation commits do not change this running source.

The original manual-only settlement description above records the portfolio
redesign. [Automatic verified settlement](AUTOMATIC_SETTLEMENT.md) now describes
the active verification queue and worker; rates and target counters remain separate.
