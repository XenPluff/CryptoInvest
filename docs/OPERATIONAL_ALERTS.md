# Operational alerts

`/admin/operations` is the administrator's operations and backup page. The
server checks once a minute while running; the browser refreshes its current
view once a minute. Findings contain counts and fixed internal links rather
than identity documents, passwords, authentication codes, or provider responses.

| Condition | Administrator destination | Trigger |
| --- | --- | --- |
| Pending deposits | Deposit reviews | At least one pending deposit |
| Pending withdrawals | Withdrawals | At least one pending withdrawal |
| Pending account transfers | Account transfers | At least one pending transfer |
| Pending identity submissions | Identity reviews | At least one pending submission |
| Email delivery trouble | Platform settings | A failing provider readiness check, a recent failed handoff with no later acceptance, or queued non-operations mail with at least three failed attempts |
| Repeated sign-in failures | Audit trail | Ten failed password/authenticator sign-ins in a rolling 15-minute window across the application; this is a review signal, not proof of compromise |
| Backup coverage | Operations | Missing encryption/storage setup, or no verified off-site upload within 36 hours when configured |
| Interrupted/failed backup | Operations | Latest scheduled run failed or remains running for over an hour |

New conditions and critical escalations atomically create workspace notifications
and durable email jobs for active, verified administrators. Unacknowledged
conditions receive at most one daily reminder. Acknowledgement requires current
TOTP and is audited; it suppresses reminders, not the underlying condition.
Cleared conditions move to Resolved. Recurrence reopens and notifies again.
Operations emails take priority over campaign traffic, retry with the existing
queue, and recheck administrator eligibility immediately before sending. Their
own retry counts do not create a growing email-failure count. Provider
readiness is refreshed every 15 minutes through read-only requests. Acceptance
does not establish inbox delivery. An email outage can delay email alerts;
workspace alerts remain visible while the database is available.

## Independent uptime checks

`.github/workflows/uptime.yml` runs from the repository's default branch `main`
on a five-minute schedule, with manual dispatch available. The application stays
on `codex/aureon-render-preview`; only the independent monitor was added to main.
This public repository's scheduled job requires no application, database, email,
or Render credentials. The pinned checkout action receives read-only contents
permission; the job's temporary GitHub token may write repository issues.

It reads only the public HTTPS health endpoint, checks website/database
availability and cached email readiness, and retries a failure three times
before opening one labeled repository issue. A subsequent healthy run posts a
recovery notice and closes that issue. Intentional funding pauses do not count
as an outage. Notice bodies contain no investor records or raw error responses.
TLS verification remains enabled. Synthetic tests exercise failure/deduplication
and recovery; an actual manual GitHub Actions run passed against the live site.

View [monitor runs](https://github.com/XenPluff/CryptoInvest/actions/workflows/uptime.yml)
and [monitor issues](https://github.com/XenPluff/CryptoInvest/issues?q=label%3Aaureon-operations).
Enable repository watching/notification preferences in GitHub to receive issue
alerts by email. Those preferences are account-controlled; an issue creation
does not establish email or inbox delivery. GitHub can delay scheduled jobs,
especially during busy periods, and can disable schedules for inactive public
repositories. The monitor is independent of Render but still depends on GitHub.
It is not a guaranteed five-minute detection service or a full transaction audit.

For a new host, update `AUREON_MONITOR_ORIGIN` in the workflow on `main`, verify
the new HTTPS health response, and dispatch it once before relying on schedules.
