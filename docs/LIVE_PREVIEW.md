# Live preview

Website: <https://aureon-preview.onrender.com>

Verified on October 20, 2026:

- Render service `aureon-preview` (`srv-dbb4i9o473hc73cjo9b0`) reports a live deploy.
- Running source commit: `d468acd03054fd58faa3fa25384dc170bb6dd0e0` from branch
  `codex/aureon-render-preview`.
- Homepage returns HTTP 200 and renders AUREON.
- `/api/health` returns HTTP 200, database `connected`, and funding enabled.
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
- Administrator target is `aurreon.support@gmail.com`. The operator upgrade
  remains unconfirmed after failed one-time startup attempts; normal startup is
  restored and live. See [administrator setup](ADMIN_SETUP.md) for the pending
  dashboard-log check.

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
