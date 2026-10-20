# AUREON card concepts and pre-launch applications

## Current product

- Homepage artwork and introduction link to the designs and pre-launch application.
  The original generated image is shown uncropped without a picture caption;
  English and French copy explains current availability.
- Public design and program information: `/cards`.
- Investor applications, preferences, history and withdrawal: `/dashboard/cards`.
- Administrator search, status filters, pagination and review: `/admin/cards`.

Black Mastercard and gold Visa concepts have AUREON branding, interactive 3D
front/back views, keyboard controls, reduced-motion support and downloadable
AI-generated design artwork. All designs are non-functional specimens. No valid
card number, expiry, CVV, PIN or issuer identifier is generated.

No issuing bank, credit program, processor or approved network relationship is
configured. Network/format choices are preferences. `CARD_PROGRAM` reports
`PRELAUNCH`, `issuingEnabled:false`, `paymentsEnabled:false`, no issuer and no
supported countries. These are not admin-editable activation flags. There is no
card issuance, credit approval, payment processing or worldwide acceptance.

## Application process

An authenticated account with verified email can submit residence country,
intended use, and preferred network design/physical-or-virtual format. Submission
requires pre-launch/privacy acknowledgements and an age-18-or-over attestation,
recorded under `card-prelaunch-v1`. The existing account supplies name/email.
No additional identity documents, income, bank details, PAN, CVV or PIN are
requested. Country entry does not establish eligibility or availability.

One record per account prevents duplicate active applications. Declined or
withdrawn applications can be resubmitted with a new version, fresh
acknowledgements and retained prior history. The UI shows the latest 30 events.
Withdrawal closes the application without claiming deletion. Retention criteria
and data-rights handling require operator implementation under applicable law.

Submission and review create in-app notices only. They do not queue external
emails, subscribe applicants to marketing, run a credit check, collect fees or
modify ledger/transaction balances. No application is shared with an issuer or
network by this implementation. The privacy notice describes this collection.

| Status | Meaning |
| --- | --- |
| SUBMITTED | Preferences recorded; awaiting preliminary review |
| UNDER_REVIEW | Operator started preliminary review |
| WAITLISTED | On the pre-launch list; no launch, eligibility or approval guarantee |
| DECLINED | Preliminary application closed with an applicant-visible message |
| WITHDRAWN | Applicant closed the request; historical record retained |

There is no APPROVED, ISSUED, ACTIVE or PAID state. Administrators can review only
submitted/under-review applications, must supply current TOTP and a public
message, and cannot review their own application. Waitlisted applicants may
withdraw. Other closed decisions cannot be overwritten. Serializable
transactions and optimistic versions protect concurrent reviews/withdrawals.

## API and storage

- `GET /api/cards`: program and current user's application/history only.
- `POST /api/cards/applications`: strict preferences/acknowledgements schema;
  verified email, five attempts per account/hour.
- `POST /api/cards/applications/:id/withdraw {version}`: owner only, ten attempts
  per account/hour; another user's or missing reference returns 404.
- `GET /api/admin/card-applications?q=&status=&page=`: admin-only, 25 rows/page,
  validated search/status. Includes account identity, platform KYC status and
  preferences; excludes authentication secrets and identity-document data.
- `POST /api/admin/card-applications/:id/review {status,message,version,code}`:
  admin role, enrolled/current TOTP and a 10–500-character applicant-visible note.
  Outcomes are UNDER_REVIEW, WAITLISTED or DECLINED only.

All mutations use existing same-origin JSON protections, bounded authenticated
requests and audit records. Client-supplied user IDs, issuer settings, credit
limits and payment credentials are rejected. Audit metadata omits residence and
review-message text; protected application events retain the public message.

Migration `20261020000200_card_applications` adds `CardApplication` and
`CardApplicationEvent`, constrained enums, unique users and unique event versions.
It does not rewrite existing financial/account data. Database backups discover
public tables dynamically, including these tables once backups are configured.

## Requirements for real cards

The operator must engage a licensed issuer and suitable program/processing
partners, establish network permission, entity/country scope, underwriting and
credit funding, KYC/AML/sanctions processes and approved cardholder/privacy terms.
APR, fees, limits, repayment, foreign exchange, delivery and eligibility must
come from the actual program, not an illustration or an admin decision.

Further integration needs provider-backed accounts/tokens, issuer-hosted handling
of sensitive card credentials, signed/idempotent webhooks, authorization and
settlement reconciliation, fraud controls, disputes, statements, repayments and
support. Issuer, country, merchant, network and regulatory restrictions apply;
global use cannot be promised from this prototype. No provider account or paid
engagement was created.

## Verification

`npm run test:integration -- --cards` creates a disposable PostgreSQL database,
applies the actual migrations and exercises real authentication/TOTP and HTTP
routes, then removes the test database. It preserves application data and forces
test email to local capture. Browser cases use request fixtures and create no
production applications. Run
`npx playwright test tests/e2e/cards.spec.ts` against a running website.
