# Render preview deployment

The Render deployment recipe is prepared in `render.yaml`. No Render account,
service, database, or public preview URL has been created from this workspace.
The account owner must complete Render's email or GitHub sign-in directly.

## Account and source access

1. Open <https://dashboard.render.com/register> and sign up with your own GitHub
   account or email. Complete any verification Render requests.
2. Authorize Render to access `XenPluff/CryptoInvest` when configuring its source.
   The current application changes are still in this workspace, not published to
   GitHub. Publish the reviewed source and `render.yaml` to the branch Render will
   use before attempting deployment; the original remote commit does not contain
   this application.
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
