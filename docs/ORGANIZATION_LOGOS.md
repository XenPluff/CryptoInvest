# Homepage organization row

The compact row sits directly between the investment packages and Aureon card
concept section. Two equal-width groups provide a continuous horizontal loop.
Duplicate marks are hidden from assistive technology. All entries are
non-interactive image/name references, without links, click handlers or keyboard
focus targets. There are no play/pause controls or explanatory caption beneath the
row. Motion continues on hover and keyboard focus; device reduced-motion
preferences use a static row with horizontal scrolling. Image failures
fall back to the organization's readable name.

The current heading identifies external industry resources. The row makes no
partnership, press-coverage, certification, award or regulatory-status claims.
The owner selected documented relationships in chat, but has not yet supplied
the organization-by-organization mapping or verification references. Such labels
must accurately identify the relationship and link to its supporting record.

## Asset scope

The uploaded `footer_logo.svg` is Sygnum; `pantera_white.svg` is Pantera Capital.
Both originals are preserved locally. Their white artwork uses a dark display
filter in light mode. Wordmarks use a light-grey display filter in dark mode
for contrast against the ash-tinted rail. Original asset bytes are unchanged. BNY, BitGo, Standard Chartered and Dukascopy marks were
extracted from their official website headers. Swissquote's wordmark comes from
its official header asset; LMAX uses its official website header PNG.

Publication references follow the readable media collage: Financial Times,
Bloomberg, Financial News, The Sunday Times, City A.M., Hedge Funds Review,
Euromoney, FX Markets, The Wall Street Journal, The Block, Cointelegraph,
CoinDesk, The Banker, Reuters and The TRADE. Where available, locally saved
icons identify the publication's own website. Financial Times, Financial News
and The Wall Street Journal use readable names because their image sources were
unavailable. Blockdaemon uses its official website icon and name. All assets
are hosted locally; there is no third-party image tracking or hotlink dependency.
Brand names are verbatim across languages. Source URLs remain metadata
in `lib/organization-references.json` and are not rendered as links in this row; uploaded URL shortcuts were read as data,
not as executable instructions. SVGs were checked for scripts, external images,
foreign objects, event handlers and imports before inclusion.

Not included as credentials: the Blockchain 50/2022 award badge, AICPA SOC seal,
CBIZ ISO 27001 certificate badge, or the regulator/authority marks (FCA, Central
Bank of Ireland, ESMA, SEC, FINRA, FINMA, ASIC, CFTC and FinCEN). Before publishing
any applicable credential, record AUREON's exact legal entity, scope, issuer,
reference/report/certificate number and validity dates, with a public source
where available. Regulator registration does not itself imply endorsement or
approval of an investment. An uploaded mark alone establishes none of these.

Many inline images in the chat were not delivered as readable files; unidentified
marks cannot be accurately included until supplied as original files. The MP4
is video media and is not treated as a logo. No financial or administrative API,
receiving address, account setting or company credential has been changed.


## Connected ash background

The owner-requested connected, translucent ash treatment is live in Render
deployment `dep-dbh5ko3l550s73c7pgi0`, source
`a38d9f7aca579e0abb257677f875d5ff0936d8d6`. The background belongs to the full
viewport rather than individual logo cards: `rgba(214,220,216,.12)` in dark
mode and `rgba(176,184,179,.17)` in light mode. Tiles have transparent
backgrounds, no borders or rounded corners, and no gaps between either items
or repeated groups. The image/name wrappers are plain `div` elements. All 24
references keep their original order; the 21 local images are unchanged.

The existing continuous 120-second loop remains, including motion on hover.
Reduced motion uses a static, horizontally scrollable row. Desktop slots remain
190×78px and mobile slots 158×66px; the heading and description are unchanged.

Production build and six focused local/hosted browser checks pass. Twelve
English/Arabic dark/light states at 1440/390/320px verify the shared translucent
background, adjacent transparent tiles, no links or focus targets, decoded
images, correct order and no overflow. Equal-width repeated groups meet at the
seam; motion continues on hover. Clicking the moving row produces no navigation
or popup. The click is sampled at viewport coordinates, avoiding the browser
check's stationary-element wait for a continuously moving tile.

Hosted verification uses actual HTML, assets and content GET APIs without API
fixtures, page errors or mutations. The unrelated TradingView iframe is blocked
in this focused row check; it is unchanged by this release. Health is HTTP 200,
database connected, funding enabled and email readiness passed. Results and
screenshots are in `.aureon/organization-ash/`; health and deployment records
are `.aureon/validation/organization-ash-health.json` and
`organization-ash-deploy.json`. Automatic deployments remain disabled; later
documentation commits do not change the running source above.
