# Deploying AUREON

Render is selected for the hosted preview. The prepared [Render guide](RENDER.md)
and `render.yaml` describe signup, source access, free preview resources, and the
locally validated hosted startup. The preview is now live at
<https://aureon-preview.onrender.com>; see [live preview status](LIVE_PREVIEW.md).

This repository supplies a deployment recipe and a working local application. The Render HTTPS preview is deployed. A custom domain, project mailbox, and Resend sender have not been provisioned. Deposits use the supplied wallet addresses directly; no external deposit-provider account is needed. Keep the origin and sender configurable, complete email-provider onboarding, and supply credentials through the host's secret manager. The owner has authorized enabled funding for the current workspace. A separate public deployment still requires its own origin, email, and operational configuration.

## Architecture

The Docker image runs Next.js on port 3000 and Express on private loopback port 4000 in one container. `API_PORT` takes priority for the Express port; this lets Render use `PORT=3000` for the website and `API_PORT=4000` for the API. Next.js forwards `/api/*` to the loopback API. PostgreSQL 17 runs separately with a persistent volume. A reverse proxy terminates HTTPS in front of port 3000; the API and database do not need public ports.

The image uses Node.js 22, installs the frozen npm lockfile, generates Prisma's Rust-free client, and builds the web app and server. Prisma uses its official WASM parser and PostgreSQL driver adapter. `npm run db:migrate` applies checked-in SQL transactionally with a database advisory lock and migration checksums; it refuses changed migration history. It does not require downloading a native Prisma engine.

## Configure secrets and origin

Copy `.env.example` to `.env` for a private single-host deployment, or provide the same keys through your platform. Restrict access to the file. Set the following before starting production:

| Setting | Required value |
| --- | --- |
| `POSTGRES_PASSWORD` | Random database password; 32 random bytes encoded as hex avoids URL escaping in the supplied Compose file. |
| `DATABASE_URL` | PostgreSQL connection string for non-Compose deployments. Compose constructs its internal URL from `POSTGRES_*`. Use your managed database's verified TLS configuration when applicable. |
| `JWT_SECRET` | Independent random secret of at least 32 characters; 48 random bytes encoded as hex is suitable. |
| `KYC_ENCRYPTION_KEY` | Exactly 32 random bytes encoded as 64 hexadecimal characters or base64. Protect and back up this key separately. |
| `APP_ORIGIN` | The final HTTPS origin, such as `https://your-domain.example`, with no path, query, or fragment. Used for cookie/origin checks and account email links. |
| `NODE_ENV` | `production`. Production rejects a non-HTTPS application origin. |
| `FUNDING_ENABLED` | The owner has authorized `true` for the current workspace. `false` is a deployment kill switch; when `true`, administrators can pause/resume using the database setting and current TOTP. Fresh templates remain `false`. |

Generate each secret independently with a trusted secret manager or `openssl rand -hex 32` (`-hex 48` for a longer JWT secret). Do not reuse example strings. `KYC_ENCRYPTION_KEY` encrypts identity payloads and TOTP secrets; replacing it without a migration makes existing encrypted records unreadable. JWT secret rotation invalidates existing authentication tokens.

`PORT=4000` selects the API port. The provided web scripts explicitly select port 3000. Keep `API_INTERNAL_URL=http://127.0.0.1:4000` for the single-container image. Next.js resolves its rewrite target during the build; changing the API topology requires rebuilding with the appropriate target. No domain is hardcoded into the application.

`TRUST_PROXY_HOPS` is optional. Configure it to match the trusted proxy chain seen by Express, including the Next.js API proxy; do not set an arbitrary large trust value. Confirm that rate limiting sees the intended client address through your hosting configuration.

## Start with Docker Compose

The supplied Compose configuration expects the populated private `.env` file. It binds the web service to loopback so that a host-level TLS proxy can expose it.

```sh
docker compose build app
docker compose up -d db
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app
docker compose ps
```

Create administrators by securely exporting `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` in the operator's shell, then forwarding these named variables without including their values in the command:

```sh
docker compose run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD -e ADMIN_NAME app npm run admin:create
```

Create two separate administrator accounts for the two-person withdrawal approval/reconciliation workflow. Enroll TOTP before financial reviews. Do not expose local Mailpit publicly or use it as your production email provider.

The Dockerfile supports an optional BuildKit secret named `environment_ca` for an approved environment CA bundle needed during dependency installation. For a host that requires it, build an image with the appropriate mounted PEM file:

```sh
docker build --secret id=environment_ca,src=/path/to/approved-environment-ca.pem --build-arg HTTPS_PROXY --build-arg HTTP_PROXY --build-arg NO_PROXY -t aureon:release .
```

The proxy flags inherit existing named build settings; omit them when no proxy is needed. The CA secret is not copied into the runtime image. Use the resulting image in your deployment configuration, or configure the same build secret in your Compose/platform build settings. Runtime egress that requires a custom CA must separately mount that approved PEM and set `NODE_EXTRA_CA_CERTS` to its path. Keep checksum and TLS verification enabled throughout; do not use insecure package-manager or certificate overrides. The supplied image has been built locally; that does not publish or configure a host.

For an existing Node host instead of Docker, run `npm ci --ignore-scripts`, `npm run build`, `npm run db:migrate`, `npm run db:seed`, and `npm start` with the production environment supplied. The current package scripts use `--env-file=.env`; create an empty, privately readable `.env` if all values are injected directly by the host. Use a process supervisor and a persistent PostgreSQL service.

## Domain and HTTPS

Point your chosen domain's DNS at the host and configure a managed HTTPS ingress or a TLS reverse proxy. For example, replace the placeholder in this Caddy configuration:

```caddyfile
your-domain.example {
    reverse_proxy 127.0.0.1:3000
}
```

Set `APP_ORIGIN` to that exact origin before starting the API. Production cookies use `Secure`; HTTP browsing of a production instance will not establish a working session. Route the website and API through the same origin. Keep database and direct API listeners private. If the proxy runs inside another container, route it to `app:3000` on the private Docker network instead of loopback.

WebAuthn passkeys use the hostname from `APP_ORIGIN` as their relying-party ID and verify the exact origin. Choose the intended hostname before production enrollment; credentials registered for localhost or another hostname do not migrate to the new hostname. Use a compatible browser/OS authenticator. Investor passkey changes require the current password, even when investor TOTP is enabled. Administrator passkey changes require current TOTP. Investor passkey login requires TOTP only when enabled; administrator sign-in and every administrator mutation require TOTP. Unenrolled administrators receive a ten-minute enrollment-only session, not workspace access.

## Account email with Brevo on the preview

For the owner-supplied Gmail sender on Render's free plan, use Brevo's HTTPS API.
See [email activation steps](EMAIL_DELIVERY.md) for sender verification, account
activation, and securely entering `BREVO_API_KEY` on Render. The non-secret
settings are `EMAIL_PROVIDER=brevo` and
`BREVO_SENDER_EMAIL=aurreon.support@gmail.com`. This prepares the integration;
messages cannot be sent until the owner provides an activated account and key.
Brevo rewrites free-domain sender addresses to its own sending domain; replies
are addressed to the project Gmail inbox.

`EMAIL_PROVIDER` accepts `brevo`, `resend`, `smtp`, or `none`. When unset, selection
prefers Brevo, then Resend, then SMTP based on available credentials. Explicitly
selecting a provider with missing required settings reports email as unconfigured
and does not silently switch to another provider.

## Account email with Resend (owned-domain alternative)

After registering the project's domain, verify a sending domain in Resend, publish the DNS records it requests, and configure:

```dotenv
RESEND_API_KEY=your-secret-key-in-the-host-secret-manager
EMAIL_FROM="Aureon <accounts@your-domain.example>"
EMAIL_PROVIDER=resend
```

The application uses Resend's HTTPS API when the key and sender are configured. Verification and recovery links are built from `APP_ORIGIN`. Confirm delivery to an inbox you control, check the branded link destination, verify a real test account, and complete a password reset. A configured key does not prove delivery; the recipient and sender must comply with the provider account's actual permissions.

`accounts@your-domain.example` is a proposed sender, not a created mailbox. Resend supplies outbound delivery; if replies or a support inbox are needed, provision that mailbox with the chosen domain's email host separately.

The owner-supplied public support address is `aurreon.support@gmail.com`, defined
in `lib/contact.ts` and linked from the support page and site footer. Publishing
this contact address does not configure outbound application mail or verify
mailbox ownership. Render's free web services block outbound SMTP ports 25, 465,
and 587, so connecting this Gmail inbox through SMTP is not supported on the
current free hosting plan. Verification and recovery messages still require a
configured sending provider.

An SMTP fallback is available using `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (or `EMAIL_FROM`), `SMTP_USER`, and `SMTP_PASSWORD`. Username and password must be provided together. Set `SMTP_SECURE=true` for implicit TLS on port 465, or use the provider's STARTTLS settings with `SMTP_REQUIRE_TLS=true`. TLS certificate verification remains enabled. Local `setup:local` uses Mailpit without TLS solely for local testing.

Activity notifications for verified accounts enter a durable database email queue in the same transaction as the activity. The API worker checks every 30 seconds and retries failed delivery with backoff, up to ten attempts. Monitor pending/failed counts in the administrator's delivery status and investigate failures; a mail outage does not reverse a financial entry. A sent/accepted result confirms provider acceptance, not delivery into the recipient's inbox.

Newsletter subscriptions require explicit consent and email confirmation before campaign eligibility. In the administration workspace, create a campaign draft, review its message, and explicitly confirm each batch with current TOTP. A batch queues at most 100 confirmed subscribers, excludes duplicate campaign recipients, and includes an unsubscribe link. The worker checks current consent and campaign status before handing off the message. Archiving cancels pending messages; provider-accepted messages cannot be recalled. Do not import or queue addresses without valid consent.

Outbound destinations include `api.brevo.com:443`, `api.resend.com:443`, and `api.coingecko.com:443`. The direct-wallet deposit workflow requires no external provider API. SMTP deployments also need their SMTP host/port. Package installation needs the npm registry; Docker builds need the chosen Node and PostgreSQL image registries. If a network allowlist exists, add required destinations without replacing unrelated entries. HTTPS provider requests honor `HTTPS_PROXY`/`HTTP_PROXY` and `NO_PROXY` through the supported environment proxy agent, with TLS verification enabled. Supply any required approved runtime CA using `NODE_EXTRA_CA_CERTS`.

## Supplied deposit wallet addresses

The deposit workflow uses the public addresses you supplied, stored in PostgreSQL by `npm run db:seed`. The seed preserves existing wallet records. No third-party deposit-provider credentials are needed.

| Asset | Network | Receiving address |
| --- | --- | --- |
| BTC | Bitcoin | `bc1qd6y65dug0zfrm6dy9m33a27k93psddqdaxs3s4` |
| ETH | Ethereum | `0x56Eb85F6DE376B668caaa4FD14113FB003772FF9` |
| USDT | TRC20 | `TXNBz6qWyo72beUWDtC1qKiBdFFb7c1A74` |
| BNB | BSC | `0x56Eb85F6DE376B668caaa4FD14113FB003772FF9` |
| SOL | Solana | `66PAnBEKahkxQzBF1kwDGETHxvrXhrKSoA43ieKwcQG5` |
| USDT | ERC20 | `0x56Eb85F6DE376B668caaa4FD14113FB003772FF9` |

Investors select the exact asset and network on the deposit page, copy the address, and submit a transaction hash for review. Administrators see the same active destinations in settings. The application does not generate receiving addresses, hold private keys, or forward deposits through another provider. Credit is recorded only after manual on-chain and claimant verification.

MetaMask and Coinbase browser-wallet ownership links are independent of the supplied deposit destinations. The application discovers installed providers and verifies an EIP-191 signed message bound to the account, session, origin, chain, nonce, and expiry. It does not request a token approval or fund transfer. An ownership link does not attribute a specific deposit or create a per-user custody address. WalletConnect QR pairing remains unconfigured.

## Funding activation and real proceeds

Activation requires the operator's actual custody arrangement, address ownership checks, independent transfer verification, identity/risk review process, account email, payout procedures, and jurisdiction-specific legal review. The included legal pages and identity form require review for your business; they are not a completed compliance program.

Funding is explicitly enabled in the current workspace at the owner's request: the private configuration uses `FUNDING_ENABLED=true` and the database setting is enabled. Administrators can pause or resume it in `/admin/settings` with current TOTP. A false deployment environment gate always overrides the dashboard setting. Startup preserves the latest administrator choice, including a pause. Users still need verified email, approved identity review, and enabled TOTP for financial mutations.

Administrators can inspect balances and ledger history at `/admin/balances`, then record a supported credit or debit with a reason and reconciliation reference. The ledger is append-only; debits must fit available funds. New request IDs prevent accidental duplicate postings. `/admin/transfers` queues internal USD transfers with an immediate sender reservation; approval credits the recipient and decline restores the reservation exactly once. Both transfer accounts must meet eligibility requirements. `/admin/transactions` filters all recorded transactions and links pending items to their corresponding review pages. These controls do not send cryptocurrency; external payouts remain under `/admin/withdrawals`.

Deposits remain pending until an administrator approves a confirmed USD amount with a current authenticator code. The deposit review form omits evidence-reference, ownership-evidence and written-note fields; the server records the administrator decision and does not generate verification evidence. Operators still need to reconcile receipt and attribution outside these fields: a public transaction hash alone does not prove that the claimant owns a deposit. Withdrawals reserve balance immediately; approval does not send cryptocurrency. Execute transfers through the external approved custody process, then have a different administrator independently reconcile the transfer and record its transaction hash. Rejection refunds the reservation once.

Investment estimates are simple prorated target calculations. Maturity does not mint money or automatically credit the estimate. An administrator records actual principal returned, realized earnings, reconciliation reference, and review note. Loss of principal can be represented by returning less than the original amount. Referral relationships are recorded; the system does not invent commissions. Settle only proceeds independently reconciled to actual available assets.

## Validation and maintenance

Before staging, run `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`, and the local browser suite described in the README. The integration helper creates and drops a separate randomly named test database using a nonproduction `DATABASE_URL` role with `CREATEDB`; it does not reset the application schema. Direct integration runs with `TEST_DATABASE_URL` reset the public schema of the dedicated `_test` database they select. Never use application or production data for that setting.

Check `https://your-domain.example/api/health`: database connectivity should be healthy, email should be configured, and funding should retain its intended setting. Validate registration, inbox delivery, reset, TOTP, passkey reauthentication/login, wallet proofs, role boundaries, identity review, empty balances/charts, statements, and support enquiries against staging. Review content publishing, newsletter consent/unsubscribe, and an explicitly authorized campaign batch using controlled recipients. Verify all three quote currencies; check public/auth pages and investor/admin controls in all eight supported languages, including Arabic RTL. Original media/documents and unknown freeform content retain their source language; see [language scope](LOCALIZATION.md). Provider connectivity and financial checks need the real external account; local tests do not establish them or a completed security audit.

Use the [encrypted backup and recovery workflow](BACKUP_RECOVERY.md) in `/admin/operations`.
It supports browser-generated recovery keys, manual encrypted downloads, optional
daily private S3/R2 storage, and verified restores into empty disposable databases.
Automatic off-site backups remain disabled until both the public encryption key
and private storage are configured. Keep recovery keys and application encryption
secrets separately; temporary Render files are not durable backups.

The [operations guide](OPERATIONAL_ALERTS.md) covers administrator alerts and the
independent GitHub Actions monitor, including notification delivery and schedule
limits. The production container includes Node 22 and PostgreSQL 17 tools and
launches only the application; the actual database remains a separate service.

The `postgres_data` volume must survive releases. `docker compose down` preserves
it; `down -v` deletes it. Before an upgrade, back up the database, review migrations,
build the new image, apply `db:migrate` once, and recreate the app. Keep access
review, reconciliation, TLS renewal, and restore drills in the operator's ongoing
process. Multi-instance rate limits and distributed session/rate-limit policy need
further infrastructure review; the included limiter is process-local.
