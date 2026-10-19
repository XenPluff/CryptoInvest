# Validation report

This records local development validation for the implemented AUREON application. Results establish the behavior exercised below; they do not certify every page, external provider, security property, or production deployment.

| Check | Recorded result | Scope |
| --- | --- | --- |
| Unit suite | 115 passed; 25 database cases skipped in this run | Investment arithmetic and precision, financial conflict retries, validation, passkeys, wallet proofs, consent, analytics, and mail. Database cases run separately below. |
| PostgreSQL integration | 25 passed against a real disposable PostgreSQL database | Direct-wallet configuration, administrator balance adjustments, transfer reserves/decisions/refunds, funding pause/resume, authorization, concurrent spending, and ledger invariants. The helper creates and removes its own database without resetting the application schema. |
| Browser suite | All 36 cases verified: 35 passed in the full run; the remaining administrator case passed on its targeted rerun after fixing menu overflow | New financial UI fixtures cover credits/debits, request IDs, transfer decisions, filters, and mobile width. The full run also covers actual account/workspace flows, administration, analytics, passkeys, wallet linking, content, public pages, and newsletter consent. Clock fixtures check six-decimal growth and maturity caps. Browser fixtures do not prove a real provider transaction. |
| Type checks and production build | Passed after the administrator financial-controls change | Next.js build and server TypeScript compilation. |
| Docker image and smoke check | Rebuilt and passed with funding enabled | Homepage, PostgreSQL connectivity, plan API, unauthenticated access rejection, and enabled funding in the Node 22 runtime. Approved environment CA/proxy settings retain TLS verification. |
| Render startup recipe | Passed locally in the rebuilt Node 22 container; 115 unit tests and type checks passed after the change | `npm run start:render` applied checked migrations and the idempotent seed, then served the website on port 3000 with its private API on 4000. Origin fallback used `RENDER_EXTERNAL_URL`. This does not establish a Render account, resource, or public URL. |
| Production dependency audit | Zero reported vulnerabilities | `npm audit --omit=dev`; this is a package advisory check, not a security assessment of the application. |
| Mobile Lighthouse homepage | Performance 94; accessibility 100; best practices 96; SEO 100 | Local homepage audit on October 19, 2026 (UTC), using the mobile form factor. A single automated homepage audit is not a site-wide accessibility, performance, or security certification. |

The precision checks distinguish estimates from money: a $100 Starter target displays $100.000028 at one second and $100.000057 at two seconds, freezes at $117.500000 after seven days, and sends no financial mutation from its clock. All posted ledger amounts remain integer USD cents. Monthly targets use a fixed 365-day annualization.

All six supplied asset/network/address mappings were checked against the active database configuration. The direct-wallet update also exposed a PostgreSQL adapter serialization-conflict representation that previously returned HTTP 500 during concurrent spending. The transaction helper now retries that conflict alongside Prisma's conflict representation, bounds retries, and returns HTTP 409 if contention persists. The real concurrent-spending integration check and focused retry tests pass.

## External-service limits

The cloud network's CoinGecko request returned an upstream/proxy HTTP 403. The application correctly exposed quote unavailability as HTTP 503 instead of inventing prices; successful live quote retrieval in this environment remains unverified. USD/EUR/GBP selection and separate caching are implemented and covered by local checks.

No domain is registered and no hosting destination was supplied. A public deployment, project mailbox, verified sender, and real Resend delivery have not been provisioned or validated. Local Mailpit captures test mail. Deposits now use the six supplied wallet addresses directly, with manual verification and no external deposit-provider integration. The application does not sign or send payouts. MetaMask/Coinbase signed ownership proofs do not authorize transfers or establish the source of a deposit; WalletConnect QR pairing remains unconfigured.

Fresh installs default to disabled funding; the owner explicitly enabled funding in this workspace, and the running health endpoint reports `fundingEnabled:true`. Administrators can pause/resume it with TOTP. Seed data contains five plan definitions and six supplied public addresses, with no seeded users, sample balances, or fabricated performance. Identity form review is not third-party identity/AML verification. Independent custody reconciliation, legal review, security assessment, production monitoring, and provider onboarding remain operational requirements before real-money use.

## Reproduce

Follow the [README](../README.md) to start the local application and services, then run:

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:e2e
```

The integration helper requires a nonproduction PostgreSQL role with `CREATEDB` and routes its test email only to local Mailpit. Direct integration runs with `TEST_DATABASE_URL` reset the public schema of the selected dedicated `_test` database; never supply application or production data. Browser runs create development records and need a running local application, PostgreSQL, Mailpit, and Chromium. If cloud settings inject Resend credentials, start that local application with `env RESEND_API_KEY= npm run dev` so browser account messages stay in local capture. See [deployment instructions](DEPLOYMENT.md) for the separate hosting and provider checks.

The administrator financial UI tests use browser request fixtures only, preventing test balances or transfers from entering the application database. The 25 integration cases exercise actual postings, contention, duplicate requests, transfer approval/refund, and pause/resume in a separate disposable database. Enabling the workspace records an owner-request audit event but creates no investor funds.
