# Business model and sector artwork

`/approach` explains ten business activities and investment interests identified
by the owner: crypto mining, financial market trading, property management,
agriculture, solar energy, tangible physical assets, natural resources/metals,
arbitrage, artificial intelligence/robotics and strategic business investments.
The owner supplied the public descriptions; no operating, financial or credential
records were inspected as part of this website-content task. Independent
verification is not asserted.

The strategic business profile uses the owner's conditional wording about equity
interests, partnerships and acquisitions. It does not invent named holdings,
completed deals, owned facilities or investment results. The three supplied
paragraphs are accompanied by expandable cost and evidence considerations, as
with the other profiles. This website update does not regenerate the existing
company-profile PDF edition.

Each profile explains a possible revenue mechanism, costs affecting net results,
key risks and the records that should support the activity. The revenue-to-net-
result diagram is an explanatory framework, not a financial statement or an
established allocation formula. Reporting principles are described as standards
to assess, not as completed audits or implemented business controls. No invented
asset balances, license numbers, staff biographies, project locations, audited
returns or guaranteed profits are included.

The page is connected through the existing approach navigation, homepage preview,
About page and footer. It does not change receiving addresses, financial routes,
investment calculations, funding settings or legal permissions.

## Artwork

Ten original sector illustrations live in `public/images/strategies/`,
created with image generation and carrying AUREON branding. The original nine
include the words "SECTOR ILLUSTRATION"; the strategic-business image contains
only the AUREON emblem and wordmark, without an AI-generated caption. Its
conceptual boardroom scene uses an existing sector picture as the brand/style
reference. Source artwork is retained unchanged as PNG; website delivery uses
Next.js responsive image handling. Profiles display the artwork without
download links or caption bars.

The homepage's "Where value takes shape" picture cycles through all ten
activities, one image at a time, on a five-second interval. The next responsive
image is decoded before replacing the current one; a failed load retains the
current image and retries. Rotation is automatic without pause/play controls,
including while hovered or offscreen. Hidden browser tabs suspend rotation until
visible again. Reduced-motion preferences disable the fade while pictures keep
cycling. The image frame keeps a fixed 3:2 ratio. Other previews remain static.

The repeated "AI-generated sector illustration" picture captions have been
removed. Alternative text describes the imagery; the new picture is identified as
conceptual artwork. The imagery does not establish ownership, operations, staff, title,
provenance, licensing or performance. Replace illustrations with genuine project
photography only after obtaining usage rights, validating what it shows and
updating the captions and alternative text.

## Maintaining the content

- Edit the sector copy in [business activities](../lib/business-activities.ts),
  and page-level source/reporting notes in [the approach page](../app/approach/page.tsx).
- Keep all image files and alt text aligned.
- Publish verifiable entity, team and activity records through a suitable secure
  disclosure process before upgrading an attributed statement to a verified one.
  Avoid public investor records and confidential commercial documents.
- Obtain jurisdiction-specific advice on financial promotions and offering
  claims; this content work does not complete the [independent legal review](reviews/LEGAL_BRIEF.md).
- Verify the production build and browser media/layout cases with
  `npx playwright test tests/e2e/business.spec.ts` against the running website.
