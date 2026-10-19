# Publications and newsletter operations

## Publications

Administrators with enrolled two-factor authentication can prepare articles, announcements, and FAQ entries in `/admin/content`. A saved draft is private. Publishing, moving a publication back to draft, and archiving require a current authenticator code and create an audit record. Published content is read through `GET /api/content` and `GET /api/content/:slug` and displayed at `/journal` and `/journal/:slug`.

Bodies are plain text. The application never interprets submitted HTML. Published entries must be moved back to draft before they can be edited. There are no seeded articles, authors, announcements, or subscriber records.

## Newsletter consent

`POST /api/newsletter` requires `{ "email": "...", "consent": true }`. It queues a confirmation email only when email delivery is configured. Existing subscriber records introduced before this feature remain unconfirmed and are excluded from campaigns.

The confirmation email opens `/newsletter/confirm?token=...`. Merely opening the URL does not change consent; the subscriber must select the confirmation button, which submits `POST /api/newsletter/confirm`. The link expires after 24 hours and is single use. Confirmation and unsubscribe tokens are stored as hashes; the unsubscribe token is additionally encrypted so it can be included in later emails without storing it as plaintext.

Campaign messages include `/newsletter/unsubscribe?token=...`. This page asks the subscriber to confirm before submitting `POST /api/newsletter/unsubscribe`; email scanners therefore do not change preferences by following a GET link. Unsubscribe is idempotent and cancels pending marketing messages. Account security and transaction notifications are independent of newsletter consent.

## Campaign review and delivery

In `/admin/campaigns`, administrators can create and edit campaign drafts. Saving a draft queues no messages. Each enqueue action requires a current authenticator code, the literal confirmation `QUEUE CAMPAIGN`, and a batch size between 1 and 100. Only currently confirmed subscribers with valid encrypted unsubscribe tokens are selected. Campaign content becomes immutable after the first batch.

Unique `(campaignId, subscriberId)` recipient records prevent the same campaign being queued again for the same subscriber. Additional batches require another explicit action. The delivery worker processes at most 10 pending messages per pass, rechecks current subscriber consent and campaign status immediately before provider handoff, and uses server-owned HTML templates that escape all submitted content. The operator can archive a campaign to cancel pending messages; accepted provider requests cannot be recalled.

The durable outbox retries failed provider requests with backoff. Delivery has at-least-once semantics: a process failure after provider acceptance and before the database acknowledgment can cause a repeated delivery. A queued count is a unique recipient count, not a count of successful inbox deliveries. Provider acceptance confirms handoff only and does not establish inbox delivery, opening, or reading.

No external campaign is activated or sent during development. Local end-to-end delivery can be inspected with the existing Mailpit configuration. A production domain and verified sender/provider configuration remain operator prerequisites.

## Integration

- Mount `contentPublicRouter` on `/api` and remove the earlier single-step newsletter subscription handler.
- Mount `contentAdminRouter` on `/api/admin`; this router includes authentication and administrator guards.
- Render `ContentOperations` at `/admin/content` and `CampaignOperations` at `/admin/campaigns`.
- `PublishedAnnouncements` and `PublishedFaqs` are optional public components; they render only actual published records.
- Apply migration `20261019000400_content_campaigns` and generate the Prisma client after merging `prisma/content-models.txt` into the shared schema.

## Validation

`tests/content.test.ts` checks consent and input boundaries, HTML escaping, safe action links, consent/archive suppression, expired confirmation suppression, provider acceptance acknowledgment, and retry behavior. The shared PostgreSQL integration suite covers actual public/admin authorization and queue transactions. These checks use isolated fixtures and local delivery, never a real subscriber list.
