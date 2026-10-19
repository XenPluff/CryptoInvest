# Live preview

Website: <https://aureon-preview.onrender.com>

Verified on October 19, 2026:

- Render service `aureon-preview` (`srv-dbb4i9o473hc73cjo9b0`) reports a live deploy.
- Running source commit: `e8daadc2346a4e65bc82e4da1fb7cc09d968cf09` from branch
  `codex/aureon-render-preview`.
- Homepage returns HTTP 200 and renders AUREON.
- `/api/health` returns HTTP 200, database `connected`, and funding enabled.
- Email delivery is unconfigured (`emailConfigured:false`).

This is the actual provider-assigned HTTPS address, not a local address or a
guessed preview hostname. The owner completed the Render Blueprint deployment
through the dashboard after Cloudflare blocked workspace/database provisioning
API calls from the cloud environment. The service and database were requested on
the blueprint's free plans.

## Remaining account setup

Public pages can be viewed now. Complete new-investor registration needs an
authorized email provider/sender for verification and recovery emails. The preview
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
