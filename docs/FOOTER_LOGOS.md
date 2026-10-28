# Footer logo layout — awaiting assets and verification

A static, non-interactive three-column grid is prepared immediately after
“A considered approach. An extraordinary perspective.” in `SiteFooter`.
Tiles are compact (56px tall on desktop, 52px on small screens), retain source
order and preserve each image's proportions. There are no links, buttons,
click handlers, focus targets, animations or hover transitions. Logo images
ignore pointer input and cannot be dragged.

`lib/footer-logos.json` is deliberately empty. Consequently the normal footer
renders no grid or placeholder and keeps its existing layout. The existing
homepage marquee remains unchanged. This footer addition is a draft and has
not been deployed.

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
