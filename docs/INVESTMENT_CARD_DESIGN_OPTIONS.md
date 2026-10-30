# Investment card design options

The owner requested ten different card designs to choose from. The first ten
concepts were subsequently rejected as not matching the desired taste. No
concept is approved for adoption. A visual reference/direction was requested
before producing the next set. The isolated
preview is `/design-studio/investment-card-options.html`; its comparison image
is `/design-studio/investment-card-options.png`. Existing homepage, catalogue
and investor cards are unchanged until a design is selected for implementation.

| Number | Direction | Visual treatment |
| --- | --- | --- |
| 01 | Obsidian | Dark satin, orbital gold, inset asymmetric frame |
| 02 | Prism | Frosted blue/lilac glass, translucent stacked geometry |
| 03 | Signal | Acid lime, oversized sans-serif type, square industrial frame |
| 04 | Atlas | Warm editorial paper, cartographic contours, serif hierarchy |
| 05 | Chrome | Brushed silver, machined inset, metallic sculpture and screw details |
| 06 | Aurora | Indigo glass, iridescent flowing light and translucent footer |
| 07 | Origami | Coral, folded geometry, angular cut corners |
| 08 | Monolith | Oxblood velvet, architectural arch, centered serif composition |
| 09 | Circuit | Phosphor green, technical grid, monospace and radar geometry |
| 10 | Cobalt | White/blue Swiss composition, halftone geometry and sans-serif type |

All ten use the same reference snapshot of the published Gold plan: a 4% daily
illustrative target, $10,100–$50,000 range and 21-day term. These are comparable
design samples, not new products or promises. The notice identifies illustrative
rates as non-guaranteed and no investment can be submitted from the preview.

## Preview behavior

Selection is browser-only: one pressed design button, a status, persisted choice,
copy-to-clipboard and clear. The page tells the owner to reply with the chosen
number/name. There is no selection API, account access, analytics, investment
submission or automatic change to live cards. The document has `noindex,nofollow`
and is not added to public site navigation. It is reachable by its preview URL;
it is not an authenticated private page.

The HTML is self-contained: CSS, scripts, original SVG graphics and embedded
DM Sans/Cormorant fonts. Font licence notices are included in source comments.
No third-party resource is requested. The comparison PNG hides the fixed
selection toolbar to keep the ten designs unobstructed.

## Regeneration and review

Run `node scripts/design/investment-card-options.mjs` using the committed
`scripts/design/investment-card-reference.json` snapshot. This writes the HTML;
the PNG is a browser capture at 1440px. Source CSS remains separate for editing.
The published data snapshot is a design reference, not a connected price or
plan feed. Scripts are not part of the production runtime.

Read-only browser checks cover all ten cards at 1920/1440/1024/768/700/390/320px,
card/button bounds, selection, keyboard activation, persistence, copy and clear.
They verify no page errors, external requests, API calls or production mutations.
The comparison image is visually reviewed. Deployment records appear in
[LIVE_PREVIEW.md](LIVE_PREVIEW.md) and [VALIDATION.md](VALIDATION.md).
