# AUREON company profile and investor guide

The English, A4, 28-page publication is available at
`/documents/aureon-company-profile.pdf`, with a download page at
`/company-profile`. The About page and public footer link to it. The page's
edition, page count and file size come from the generated JSON manifest.

The document includes all 15 pre-existing public website pictures: nine sector
illustrations, the card design collection and five video posters. Two new
abstract brand pictures are retained unchanged in `public/images/company/`.
PDF layouts add the exact company mark, embedded brand fonts, vector process
diagrams, bookmarks, linked contents, resource links and a website QR code.
Picture encoding is compressed for a practical download without changing the
original website artwork. No private account or investor records are included.

## Content and scope

Business-sector copy comes from `lib/business-activities.ts`; video descriptions
and durations come from `lib/video-content.ts`. The five-plan snapshot was
checked against the live public plan API for the October 21, 2026 edition.
The profile also covers account and transaction processes, security controls,
card applications, development priorities, reporting, risk, policies, referrals
and contact information.

This is a branded company overview, not an audited financial statement, offering
document, license, credit agreement or independent company verification. It
does not fabricate entity references, leadership, asset holdings, results,
certifications, insurance, partnerships or territorial permissions. Target
rates remain identified as exceptionally high, illustrative and not guaranteed.
Card design/preferences are distinguished from issuance, credit and payments.
Development priorities are a framework, not completed performance milestones.
Production-method labels are omitted from the publication.

## Rebuild and verify

```sh
npm run profile:build
npm run build
npx playwright test tests/e2e/company-profile.spec.ts
```

The PDF generator uses the existing PDFKit, brand font and image tooling. It
requires the two checked-in new artwork files and the existing public images.
It writes the PDF, its manifest and an ignored layout/source-image inventory
under `.aureon/company-profile/`. Layout bounds, expected page count and source
image inclusion are checked during generation. No application database is used.

Before a new edition, recheck live plan parameters, operational scope, product
terms and contact details, then update the edition and snapshot in
`scripts/build-company-profile.mts`. Regenerate the PDF and manifest together.
Render pages with a PDF renderer and inspect them before publishing. Local
validation also checked all 28 pages for text bounds, embedded fonts, outline
destinations, all original pictures, the website QR target, and PDF download
integrity/byte ranges. This does not replace independent legal/security review.
