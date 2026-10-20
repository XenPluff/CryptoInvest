# Live preview

Website: <https://aureon-preview.onrender.com>

Verified on October 20, 2026:

- Render service `aureon-preview` (`srv-dbb4i9o473hc73cjo9b0`) reports a live deploy.
- Running source commit: `44c48245824e796fefa95450c286ab94b0fa1eb1` from branch
  `codex/aureon-render-preview`.
- The [video library](https://aureon-preview.onrender.com/videos) is live in
  deployment `dep-dbbrh9gu01pc738prbp0`. Five actual MP4s cover the introduction,
  account setup, deposits, withdrawals and a short brand film, with ambient
  music, English captions, transcripts and downloads. The homepage and navigation
  link to the collection; deposit and withdrawal screens link to their guides.
  Actual deployed HTML/media passed browser playback, caption and chapter-seek
  checks without API fixtures, plus 1440/390/320px English/French navigation
  layouts and HTTP 206 media range checks. Resources were retrieved through the
  existing verified-TLS client because the cloud browser lacks the proxy CA.
  No real account, deposit, withdrawal or email was created by these checks.
- Homepage returns HTTP 200 and renders AUREON.
- `/api/health` returns HTTP 200, database `connected`, and funding enabled.
- [Operations & backups](https://aureon-preview.onrender.com/admin/operations)
  is live in deployment `dep-dbbp43nf3r2c73dt15dg`. The page returns 200 and its
  unauthenticated API returns 401. Hosted HTML/assets passed browser checks for
  local recovery-key generation, public-key-only submission, and 1440/390/320px
  layouts using browser-only account/operations fixtures. TLS verification was
  retained through the trusted HTTPS client; no real admin session or backup
  was created by that check. The owner still needs to generate/save a recovery
  kit and configure private storage to activate daily off-site backups.
- The independent GitHub monitor is active on `main`; manual run `39455326506`
  passed against the updated service. Scheduled checks and repository issues run
  outside Render; GitHub account notification preferences control outage email.
  See [backup setup](BACKUP_RECOVERY.md) and [alerts](OPERATIONAL_ALERTS.md).
- The redesigned [investor deposit page](https://aureon-preview.onrender.com/dashboard/wallets)
  is deployed in `dep-dbbo10nf3r2c738lcqrg`. It uses the unchanged wallet catalogue,
  with currency/network selection, local QR codes, address copying, authenticator
  submission, and recent deposit statuses. The deployed HTML/assets were checked
  in Chromium with browser-only account/wallet fixtures: all six QR destinations
  matched, 1440/390/320px layouts fit, and no page errors occurred. No live
  account or financial records were created by those checks.
- Email settings are present (`emailConfigured:true`), and the startup check from
  Render reports `emailDeliveryStatus:checks_passed` after the owner authorized
  the outbound IP ranges and restarted the service.
- The owner entered `BREVO_API_KEY` in Render alongside `EMAIL_PROVIDER=brevo`
  and `BREVO_SENDER_EMAIL=aurreon.support@gmail.com`. The read-only account check
  confirms transactional sending enabled and the matching sender active. Follow
  [email activation steps](EMAIL_DELIVERY.md) to test a real verification/reset
  email; provider readiness does not establish acceptance or inbox delivery.
- Public contact email: `aurreon.support@gmail.com`, supplied by the owner. The
  homepage footer and support page return HTTP 200 with working `mailto:` link
  destinations. The support form continues to save requests in the admin queue;
  publishing the inbox does not enable outbound account mail.
- The owner reports receiving the verification email, verifying their address,
  and signing in successfully. Password-reset inbox delivery is not confirmed.
- Administrator access is enabled for `aurreon.support@gmail.com`. The requested
  one-time promotion retry became live; normal startup is restored and temporary
  operator settings removed. The owner must sign in again and complete
  authenticator setup if needed. See [administrator setup](ADMIN_SETUP.md).

This is the actual provider-assigned HTTPS address, not a local address or a
guessed preview hostname. The owner completed the Render Blueprint deployment
through the dashboard after Cloudflare blocked workspace/database provisioning
API calls from the cloud environment. The service and database were requested on
the blueprint's free plans.

## Remaining account setup

Public pages can be viewed now. Brevo access and sender checks pass, and the
owner reports completing verification and sign-in. Recovery inbox delivery
remains unconfirmed. The preview
does not expose the development Mailpit inbox.

No default administrator credentials are created. Administrator access requires
the secure account-creation workflow and authenticator enrollment. Do not add a
public default password or bypass authentication to make the admin screens visible.

Financial controls use the supplied receiving wallet addresses and manual
deposit/payout verification. The application does not broadcast cryptocurrency
payments. Enabling funding does not seed balances, confirm transfers, or make
illustrative target returns withdrawable.

Automatic deploys are disabled. Later source/documentation commits do not change
the running service until an explicit deployment is requested. Check Render's
reported running commit and the actual HTTPS endpoints when validating updates.
