# Footer resources and pending credential logos

## Investor education resources

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

Published in source `65205b2d0b2036f611326fca9f9979d063794dd6`, Render deployment
`dep-dbgougvlk1mc7394c0e0`; hosted footer verification passed on October 27, 2026.

Its visible heading is “External investor education” and its accompanying note
is “Educational resource only; no SEC endorsement of AUREON.” Both are translated
across the site's languages. The images have no link, button, action, animation
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
