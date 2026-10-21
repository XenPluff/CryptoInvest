# AUREON · CryptoInvest

Live preview: <https://aureon-preview.onrender.com>.
See [live preview status](docs/LIVE_PREVIEW.md) for verification and remaining
email/administrator setup.

[Deploy the prepared preview to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FXenPluff%2FCryptoInvest%2Ftree%2Fcodex%2Faureon-render-preview)

A full-stack digital asset investment website with a responsive 3D landing page, live market data, account authentication, investor and administration workspaces, and a content studio. Built with Next.js 15, React 19, Three.js, Express 5, PostgreSQL 17, and Prisma 6.

The application records real database activity. Fresh installations have no investors, balances, transactions, testimonials, or performance history. Fresh installations default to disabled funding. The owner has explicitly enabled funding in this workspace; administrators can pause or resume it in Platform settings. No public deployment, provider activation, security audit, or regulatory approval is implied by this repository.

## Run locally

Requires Node.js 22 or newer, npm, and a running Docker engine. Use the existing checkout; cloud tasks already provide isolation, so a separate Git worktree is unnecessary unless requested.

```sh
npm ci --ignore-scripts
npm run db:generate
npm run setup:local
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The API listens on port 4000 and is available through `/api` on the website. `http://localhost:8025` is the local Mailpit inbox: registration, verification, and password-reset emails are delivered there for testing. Mailpit does not send email to the public internet.

`setup:local` creates private `.env` configuration with random keys and starts PostgreSQL and Mailpit containers. It preserves an existing `.env`; when bringing your own configuration, supply PostgreSQL yourself or create the private `.aureon/postgres.env` required by that helper. Local database files live under `.aureon/postgres`. Keep `.env` and `.aureon` out of version control.

The idempotent seed adds five supplied plan definitions and six supplied public deposit addresses. It creates no users, funds, or custody verification. Those addresses must be verified against the operator's actual custody arrangement before accepting transfers.

## Create an administrator

There are no default administrator credentials. Set `ADMIN_EMAIL`, a unique `ADMIN_PASSWORD` of at least 14 characters and at most 72 UTF-8 bytes, and optionally `ADMIN_NAME` through your secure shell or secret manager, then run:

```sh
npm run admin:create
```

The command refuses to overwrite or elevate an existing account. Sign in at `/login`, enroll an authenticator under account security, and use `/admin`. Financial reviews require TOTP. Withdrawal approval and payout reconciliation require different administrators.

For an existing verified, active account, an authorized operator can set
`ADMIN_EMAIL` and run `npm run admin:promote`. This preserves credentials and
funds, revokes prior sessions/reset links, and audits the role change. See
[administrator setup](docs/ADMIN_SETUP.md) for the one-time Render procedure.

## Development checks

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
```

`npm test` covers calculations, validation, authentication, wallet proofs, consent, and other isolated behavior. `npm run test:integration` uses the local `DATABASE_URL` connection to create a randomly named disposable PostgreSQL database, runs the integration suite, then drops only that new database. The database role needs `CREATEDB`; the helper refuses production mode and never resets the application schema.

When running the integration file directly, `TEST_DATABASE_URL` must reference a dedicated disposable database whose name ends in `_test`. **That direct test run resets the selected database's public schema.** Never point it at application or production data.

With the local application, database, Mailpit, and Chromium running:

```sh
npm run test:e2e
```

The Playwright configuration uses `/usr/bin/chromium` by default; set `CHROMIUM_PATH` for another installed browser. `E2E_BASE_URL` and `E2E_MAILPIT_URL` override their localhost defaults. Browser tests create real local test records, so use a development database and inbox.

When cloud settings provide email credentials, start the local browser-test application with `env EMAIL_PROVIDER=smtp RESEND_API_KEY= BREVO_API_KEY= npm run dev` to select the configured Mailpit SMTP capture. This affects only that development process and preserves saved credentials. The integration helper always routes its own test mail to local Mailpit on port 1025; it never uses inherited Brevo/Resend keys or production SMTP credentials.

## What is implemented

Backups and operational alerts are available in **Administration → Operations &
backups**. Start with the [recovery-kit guide](docs/BACKUP_RECOVERY.md) and
[alert setup](docs/OPERATIONAL_ALERTS.md). Automatic off-site storage requires a
private bucket and credentials; encrypted manual downloads need only your
browser-generated recovery kit. Verify the backend workflows separately with
`npm run test:integration -- --operations` against local development services.

- Public pages, responsive navigation, themes, WebGL artwork, plan calculator, and actual CoinGecko USD/EUR/GBP quotes with an explicit unavailable state. Public pages, authentication and investor/admin interfaces support English, French, German, Spanish, Italian, Russian, Ukrainian and Arabic, including Arabic RTL layouts. Original media/documents and private or unknown freeform content keep their source language; see [language scope](docs/LOCALIZATION.md).
- Email verification and reset links, HTTP-only sessions, bcrypt passwords, authenticator TOTP, WebAuthn passkeys, and queued activity emails. Passkey changes require fresh account proof; passkey login retains enabled TOTP.
- Database ledger balances, balance activity and allocation charts, deposit declarations, withdrawal reservations, plan purchases, and manually reconciled settlements. Charts use actual records and start empty.
- Fillable identity submission and operator review, profile, direct referrals, notifications, PDF statements, and MetaMask/Coinbase browser-wallet ownership linking through signed messages.
- Administrator funding controls, audited balance credits/debits, internal transfer approval/decline, all-transaction filters, deposit/withdrawal reviews, actual-record analytics, plan management, account suspension, audit records, support enquiries, content drafts/publishing/archiving, and consent-based newsletter campaign batches. Newsletter subscribers confirm their email and can unsubscribe; the public journal starts empty.

Wallet linking proves control of an EVM signing address; it does not prove a deposit's source, transfer funds, or enable WalletConnect QR pairing. Deposits use the six supplied receiving wallet addresses, with manual transaction verification; no external deposit-provider account or API key is required. The Render preview supports Brevo's HTTPS account-email API with the owner-supplied Gmail sender, alongside Resend and SMTP alternatives. The deployed readiness check now passes after IP authorization: transactional sending is enabled and the configured sender active. Actual public inbox delivery remains unconfirmed. Follow the [email activation steps](docs/EMAIL_DELIVERY.md).

Published plan rates are unusually high, illustrative targets supplied for this project, not realized returns or guarantees. Calculations use simple prorated growth, never compounding. The live target displays six decimal places and stops at the stored term; these extra digits are not settled funds. Estimated growth does not credit a balance; only reconciled integer-cent ledger entries do. Identity forms do not constitute independent identity verification, sanctions screening, or a complete AML program.

See [feature status](docs/FEATURE_STATUS.md) for implementation limits, the [validation report](docs/VALIDATION.md) for completed checks and their scope, and [deployment instructions](docs/DEPLOYMENT.md) for production configuration, supplied deposit wallets, email providers, TLS, backups, and funding activation. The [Render preview guide](docs/RENDER.md) describes the live hosting setup. Configuration names are documented in [.env.example](.env.example); API shapes are in [lib/contracts.md](lib/contracts.md).
