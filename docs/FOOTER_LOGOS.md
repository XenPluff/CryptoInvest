# Footer resources and pending credential logos

## External resources

### Single muted-grey label

The owner approved replacing the former education heading and explanatory
paragraph with one visible label: “External resources”. It appears once above
the existing grid, in sentence case and the theme's muted grey (`#99999d` in
dark mode, `#6d6a61` in light mode). The former two lines are removed from the
rendered section. Translations cover all seven additional website languages.
The thirteen references, source images, order, dimensions and non-clickable
static presentation are unchanged. The heading continues to identify the logos
as external resources.

### Compact resource grid

The owner requested smaller logos arranged in order. The section now uses
`lib/education-resources.json` to render a static, non-clickable three-column
grid, at most 320px wide, with 40px image areas, 74px rows and small readable
organization labels. The existing five references remain first; new references
follow the upload order: FinCEN, CFTC, ASIC, FINMA, Central Bank of Ireland, FCA,
CBIZ and CB Insights. AICPA is not duplicated.

There are thirteen references: twelve local logo images and a readable CB
Insights name fallback. The CB Insights homepage, research page and favicon
returned HTTP 403; no image is fabricated. The owner was informed before
implementation. The CBIZ ISO 27001 seal, AICPA SOC seal and CB Insights Blockchain
50 award badge are not published. They are represented only by ordinary
organization references under the existing education heading and
no-affiliation/endorsement note. No regulatory, audit, certification, award or
relationship claim is made for AUREON.

New original assets come from the official sites:

| Reference | Original asset source | SHA-256 |
| --- | --- | --- |
| FinCEN | <https://www.fincen.gov/themes/custom/fincen/logo.png> | `b9165b4cef1148639df0344575ac0b24bd301cd434128cecef516a3c36d80bc6` |
| CFTC | <https://www.cftc.gov/sites/all/themes/cftc/images/Final-CFTC-Logo-Long.png> | `435176b9f22593848e9f69c39ecc4d577f373177c3b3ccff77ac45fd584cc73a` |
| ASIC | <https://download.asic.gov.au/asic-nextgen/img/asic-logo.svg> | `6d6204d0a53859e784b835fda394e51837c1ee65446282896ea627e4437e00c5` |
| FINMA | <https://www.finma.ch/~/media/finma/images/logo/finma-logo.png> | `035c96ed13637c80568bf239d25a9bc9e14d984b92c54d15285ba4ea0d2ae707` |
| Central Bank of Ireland | <https://www.centralbank.ie/images/default-source/logos/logo.png?sfvrsn=3dff671a_5> | `bbe43f6d15e41e88737e3f11c53c86bfc55839f3510b265abd3b4f800fc68436` |
| FCA | <https://www.fca.org.uk/themes/custom/fca/images/logo.png> | `b496e1dd3a7bf10198e335bb0cb647bb372b16113faadf19783477b5e866a7e4` |
| CBIZ | <https://www.cbiz.com/wp-content/uploads/2024/11/brand.svg> | `ab6c118e0d2467b8a987ecc7bfbf1d8451b631505fc5310e7dd6c52695671207` |

All assets stay under `public/images/footer-logos/`, with no hotlinked images.
The ASIC SVG embeds a static PNG as a data URI; its XML, references and decoded
PNG signature were inspected. There are no scripts, event handlers, foreign
objects or external image requests. CBIZ's SVG contains only static graphics.
The full-color FinCEN seal retains its internal colors; other wordmarks use the
existing theme-aware presentation. ISO's internal white lettering is preserved.

Published in source `af2d7de4d05f40e6b0ceff4276c3dc1a2b0b5718`, Render deployment
`dep-dbgs1poae00c73d97clg`. Hosted verification passed on October 28, 2026:
all twelve original asset hashes, thirteen references in order, three columns,
16 English/Arabic theme/width states, no click navigation or animations, and no
page errors. Both theme screenshots confirm the compact grid. Initial status
reads had transient proxy 502 responses; the first hosted width assertion timed
out. The diagnostic run passed every state without code changes or reproducing
overflow. No investor records were changed.


### Background-free footer presentation

The owner requested removal of the white backgrounds in this section. The
education tiles now have a transparent background and no border. The source
image files are unchanged: Investor.gov, SEC and AICPA already carry transparency.
Dark mode renders these wordmarks and ESMA in lighter monochrome for contrast;
light mode keeps their original colors.

ESMA's JPEG has an embedded white matte, which is blended into the actual footer
backdrop using screen blending in dark mode and multiply in light mode. ISO's
official PNG has a white outer margin: a CSS inset clips just that margin using
its original red-square bounds (x=475–725, y=190–440 in the 1200×630 image). Its
red field and white internal lettering are preserved. No image pixels, brand
geometry, text, source hashes, resource labels or reference order are modified.
The resources remain static and non-clickable.

Published in source `020536e8ca8144a6adbc4506cc130e939e2da5b5`, Render deployment
`dep-dbgqrrfb9u1s7391pomg`. Hosted verification passed on October 28, 2026:
16 English/Arabic theme/width states, transparent tile styles, dark/light theme
screenshots, all five unchanged original image hashes, no navigation or animation,
and no page errors. No investor records were changed.


### ISO education reference

The follow-up upload `file_000000007b9c8243bca96f2348368952` (`download.avif`)
depicts an “ISO 27001 Certified” badge with British Assessment Bureau and UKAS
marks. It is not published. Following the owner's accepted organization-logo
approach for AICPA, the education section instead adds the ordinary ISO
organization logo, with no certification or auditor claim. The owner was told
of this choice before implementation.

The source is ISO's official homepage, <https://www.iso.org/home.html>, which
publishes the following Open Graph image:
<https://www.iso.org/modules/isoorg-template/img/iso/iso-logo-og.png>.
The unchanged original is `public/images/footer-logos/iso.png` (5,878 bytes,
1200×630; SHA-256
`0e07e2bfd43a0a0aab819c735cd30d193ad1d616b9ab5f1a8253ebff61f3b908`).
It follows ESMA as the fifth static, non-clickable education tile and retains
the shared external-education heading and no-affiliation/endorsement note.
Its alt text identifies the International Organization for Standardization.
Credential-logo data remains empty.

Published in source `ca0b6495561bfb82f3c6ede4cc13c30eeea2b3f6`, Render deployment
`dep-dbgqi3p42hec73dpgimg`. Hosted verification passed on October 28, 2026:
all five original image hashes, 16 English/Arabic theme/width states, successful
decoding, no click navigation or animations, and no page errors. No investor
records were changed.


### AICPA replacement

The owner explicitly chose a standard AICPA organization logo to replace the
Blockdaemon footer tile. The uploaded `download.avif` is an AICPA SOC assurance
seal; it was inspected and is not included in the website. The replacement is
the ordinary AICPA logo published as the official site's Open Graph image at
<https://www.aicpa-cima.com/>:
<https://images.ctfassets.net/rb9cdnjh59cm/43ZKFkefBBGDMM3VoBYWIP/b4d7a47dedb6d7232936e0c8beb6e764/Logo_1200x630.png>.

The original PNG is stored unchanged as
`public/images/footer-logos/aicpa.png` (176,913 bytes, 1200×630; SHA-256
`d6dd4e21fd826f32f07a52d4fc488eadcfdef18a94868dacd6ee1259e2695c48`).
The third education tile now identifies “AICPA — American Institute of Certified
Public Accountants”. It retains the shared external-education heading and
no-affiliation/endorsement note, with no link, button or animation. This does not
claim a SOC report, audit, certification, membership or AICPA relationship.
Blockdaemon's separate homepage industry-resource reference is unchanged.

Published in source `fc313304c783b8256f022c7a2300952d340ef432`, Render deployment
`dep-dbgqde8ae00c73d5hq00`. Hosted verification passed on October 28, 2026:
16 English/Arabic theme/width states, four original asset hashes, successful image
decoding, AICPA presence and Blockdaemon footer absence, no click navigation or
animations, and no page errors. No investor records were changed.


### Earlier resource additions

The owner approved a static, non-clickable Investor.gov resource beneath the
footer tagline. It uses the exact PNG supplied from the SEC website:
<https://www.sec.gov/files/styles/card_with_sidebar_1x/public/images/sec-logo-investor-1x.png?itok=D8Qe5r5P>.
The original image is stored unchanged at
`public/images/footer-logos/investor-gov.png` (20,839 bytes; SHA-256
`04bafe74854dcd35d0333c887f9cfe38f8b9e029996b6c97f46eb08079de718a`).

The owner also requested the SEC wordmark as an external investor-education
resource. Its original PNG is stored unchanged at
`public/images/footer-logos/sec.png` (31,878 bytes, 1248×316; SHA-256
`8a5f7a788a7bb9d609f18f2b6869c1696c06704bf4fb0d8f696309afcda3bbeb`),
from <https://www.sec.gov/themes/custom/uswds_sec/dist/img/logos/sec-logo-1x.png>.
Both marks share the education heading and note below, in two static,
non-clickable tiles. Neither is presented as an AUREON credential.

The next owner request identifies Blockdaemon and ESMA as additional external
education resources. Four other attachments did not render and cannot be
identified or published from the supplied message. No badges are inferred from
earlier uploads.

- Blockdaemon: the current purple wordmark is taken from the official homepage
  header, <https://www.blockdaemon.com/>, whose image source is
  <https://cdn.prod.website-files.com/6a454e50f799e4616f7f1eba/6a84e41e53e82d99bf0b1ed9_Purple-Logo%20Lockup.svg>.
  This differs from the older cyan mark visible in the message; the owner was
  informed of that difference. Stored unchanged as `blockdaemon.svg` (4,323
  bytes; SHA-256 `4a0cfe0fb73bf3968203373ee21deb6fb4be20d3d3f6c8e9e0d9681f2bbefad2`).
  The SVG contains no script, foreign object, embedded image, event handler,
  external request or imported stylesheet.
- ESMA: the logo comes from the European Union's official
  [ESMA profile](https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/search-all-eu-institutions-and-bodies/european-securities-and-markets-authority-esma_en),
  using its [original image source](https://european-union.europa.eu/sites/default/files/styles/oe_theme_medium_no_crop/public/2023-01/ESMA%20Main%20Colour.jpg?itok=Opap-03M).
  Stored unchanged as `esma.jpg` (28,879 bytes, 991×458; SHA-256
  `0e71a2fbd2b34a3b8bde37c70744f2495a9bc0db905d86760da3140a7f1f0cff`).
  The ESMA homepage itself returned HTTP 403; the official EU profile and image
  returned HTTP 200. This is an education reference, not an authorization claim.

These files live under `public/images/footer-logos/`. All four tiles are static
and non-clickable. The heading stays “External investor education”; the shared
note is now “Educational resources only; no affiliation or endorsement of AUREON
is implied.” Both are translated across the site's languages.

The four-resource footer is live in source `f98b5ee8708864bffacd4bf2f211db63f451587b`, Render
deployment `dep-dbgpujnlk1mc7396mfq0`. Hosted verification passed on October 28,
2026: all four original asset hashes, 64 language/theme/width states, static
presentation and no click navigation. No production investor records were changed.

The earlier two-resource footer was published in source `746d8a2bb0945217fc2a1a97f38089bf7ddae2cd`, Render
deployment `dep-dbgpi9ei0phs738lqgi0`. Actual hosted HTML/assets passed 64
language/theme/width states and both original PNG hashes on October 27, 2026.

Published in source `65205b2d0b2036f611326fca9f9979d063794dd6`, Render deployment
`dep-dbgougvlk1mc7394c0e0`; hosted footer verification passed on October 27, 2026.

The original two-resource version used the accompanying note “Educational
resource only; no SEC endorsement of AUREON.” The images have no link, button, action, animation
or hover effect. This placement makes no registration or credential claim.

## Pending credential layout

A static, non-interactive three-column grid is prepared immediately after
“A considered approach. An extraordinary perspective.” in `SiteFooter`.
Tiles are compact (56px tall on desktop, 52px on small screens), retain source
order and preserve each image's proportions. There are no links, buttons,
click handlers, focus targets, animations or hover transitions. Logo images
ignore pointer input and cannot be dragged.

`lib/footer-logos.json` is deliberately empty. Consequently the normal footer
renders no credential grid or placeholder. The existing homepage marquee remains
unchanged. The credential grid remains a draft; the separate Investor.gov
educational resource does not populate it.

The remaining identifiable images supplied in chat are regulator/authority
marks, an AICPA SOC seal, a CBIZ ISO 27001 badge and a Blockchain 50/2022 award.
The owner selected documented relationships but has not supplied their entity-
specific records or original files for the unreadable inline images. Do not
populate this grid with unsupported credentials or source them from another
company's footer. Before adding a credential, check AUREON's exact legal entity,
issuer, scope, reference and validity dates, and whether the issuer permits this
use of its mark. Registration does not itself imply endorsement of an investment.

Once records and image files are supplied, approved entries use this shape:

```json
{"id":"unique-logo-id","name":"Accurate organization or credential name","image":"/images/footer-logos/approved-original.svg"}
```

Keep the associated verification record in this document when approving an
entry. Plain organization logos must likewise have accurate context rather than
an unsupported partnership or endorsement implication.

Local layout screenshots are clearly labeled previews. They use the eight
existing organization wordmarks only to demonstrate placement and spacing;
those sample entries are never written to production data or deployed as the
remaining badges.
