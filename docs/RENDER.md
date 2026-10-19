# Render preview deployment

The owner has created a Render account and connected an API key. The application
and blueprint are published on GitHub branch `codex/aureon-render-preview`.
The owner completed Blueprint deployment. The verified preview is live at
<https://aureon-preview.onrender.com>; see [live preview status](LIVE_PREVIEW.md)
for the running commit, health verification, and remaining email/admin setup.

## Next step: deploy in the Render dashboard

[Deploy AUREON on Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FXenPluff%2FCryptoInvest%2Ftree%2Fcodex%2Faureon-render-preview)

Open the link while signed in to Render, authorize access to the repository if
prompted, and deploy the Blueprint. It contains the free web service and free
PostgreSQL resource definitions. Wait for the web service to show Live and use
the HTTPS address Render actually assigns.

The API key successfully listed services (none existed), but workspace and
PostgreSQL API requests from this cloud environment returned HTTP 403 Cloudflare
block pages. Provisioning therefore needs the normal Render browser flow unless
Render resolves that restriction. Do not attempt to bypass the protection or
claim that a service exists based only on the source being published.

## Account and source access

1. Open <https://dashboard.render.com/register> and sign up with your own GitHub
   account or email. Complete any verification Render requests.
2. Authorize Render to access `XenPluff/CryptoInvest` when configuring its source.
   Select `codex/aureon-render-preview`; the original `main` commit does not contain
   this application. The direct deployment link above selects the prepared branch.
3. Create a Blueprint from that branch and review the web/database resources.
   The recipe explicitly requests the `free` plans documented by Render. Do not
   accept a paid resource substitution without the owner's authorization.

Render assigns an HTTPS `onrender.com` address; no purchased domain is needed.
Free resources have provider limits and are intended here for previewing. Check
Render's current free-instance and database retention limits in the dashboard.

## What the recipe does

- Builds the existing Node 22 Docker image, then starts `npm run start:render`.
- Applies the checked SQL migrations and idempotent plan/address seed before
  launching the built application. Existing balances and user data are preserved.
- Serves the website on `PORT=3000` and its private loopback API on `API_PORT=4000`.
- Uses the managed database's internal connection string and generates independent
  JWT and KYC encryption secrets. Render's generated 256-bit base64 values are
  supported by the server.
- Derives the exact HTTPS origin from Render's `RENDER_EXTERNAL_URL`, unless an
  explicit `APP_ORIGIN` overrides it. This keeps authentication links and origin
  checks aligned with the actual assigned hostname.
- Sets funding enabled, matching the owner's instruction. An administrator can
  subsequently pause or resume it; startup preserves that database setting.
- Leaves automatic deploys off and exposes `/api/health` as the health check.

The recipe creates no default administrator or test funds. Administrator access
requires the existing secure account-creation workflow and authenticator setup.
Real email verification/recovery still requires an authorized email provider and
sender configured securely on Render. The local Mailpit inbox is not deployed or
exposed publicly. Without email setup, public pages can be previewed, but complete
new-investor registration is not ready for public use.

## Deploying through the Render API

If the owner wants the assistant to finish provisioning, create a Render API key
under the account settings after signup, and provide it through secure environment
settings as `RENDER_API_KEY`, restricted to `api.render.com`. Do not paste it in
chat. No API key is included in the repository or blueprint.

After source publication and account authorization, provisioning and the resulting
HTTPS URL must be verified against Render itself before claiming the website is
publicly live. Saving a cloud-environment draft does not create a Render account
or deploy the website.

## Local validation of the hosted startup

After building `aureon:local` and starting local PostgreSQL/Mailpit, run:

```sh
CONTAINER_CHECK_RENDER=true CONTAINER_CHECK_FUNDING_ENABLED=true node scripts/check-container.mjs
```

This exercises the hosted startup command, migration/seed steps, separate ports,
Render-style origin fallback, homepage, database, plan API, authentication
boundary, and enabled funding. It uses local services and creates no public URL.

Reference: <https://render.com/docs/blueprint-spec>.
