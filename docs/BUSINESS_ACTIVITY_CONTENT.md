# Business model and sector artwork

`/approach` explains nine business activities and investment interests identified
by the owner: crypto mining, financial market trading, property management,
agriculture, solar energy, tangible physical assets, natural resources/metals,
arbitrage, and artificial intelligence/robotics investments. The owner also
confirmed a claim of 7–15 years of trader
experience in chat on October 20, 2026. No operating, financial or credential
records were inspected as part of this website-content task. Company-supplied
descriptions and experience claims are attributed on the page; independent
verification is not asserted.

The AI/robotics profile describes an investment interest, without inventing a
named holding, owned laboratory, robot fleet or software product. It distinguishes
revenue earned by investee businesses from dividends, distributions and realized
investment gains that may accrue to AUREON.

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

Nine original AI-generated sector illustrations live in
`public/images/strategies/`, each carrying an AUREON logo watermark and the words
"SECTOR ILLUSTRATION". The existing company brand mark was supplied as the logo
reference. Source artwork is retained unchanged as PNG; website delivery uses
Next.js responsive image handling. Each picture can be downloaded in its
original form from its profile.

The repeated "AI-generated sector illustration" picture captions have been
removed. Image alternative text and the page's introductory source note describe
the imagery. The imagery does not establish ownership, operations, staff, title,
provenance, licensing or performance. Replace illustrations with genuine project
photography only after obtaining usage rights, validating what it shows and
updating the captions and alternative text.

## Maintaining the content

- Edit the sector copy in [business activities](../lib/business-activities.ts),
  and page-level source/reporting notes in [the approach page](../app/approach/page.tsx).
- Keep all image files, captions, download links and alt text aligned.
- Publish verifiable entity, team and activity records through a suitable secure
  disclosure process before upgrading an attributed statement to a verified one.
  Avoid public investor records and confidential commercial documents.
- Obtain jurisdiction-specific advice on financial promotions and offering
  claims; this content work does not complete the [independent legal review](reviews/LEGAL_BRIEF.md).
- Verify the production build and browser media/layout cases with
  `npx playwright test tests/e2e/business.spec.ts` against the running website.
