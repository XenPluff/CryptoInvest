# Website text sizes

The owner supplied desktop screenshots as a size reference. The website now
uses a shared, responsive text scale while keeping AUREON's font families,
colors, content and branding.

| Role | Default size |
| --- | --- |
| Reading paragraphs | 18px, 1.5 line height |
| Navigation, buttons and form controls | 16px |
| Supporting labels | 14px |
| Fine print and small metadata | 12px |
| Card and workspace panel titles | 22px |
| Subheadings | 28px |
| Major section headings | 28–36px, responsive |
| Main page headings | 32–48px, responsive |

The variables live in `app/globals.css`, using `rem` values so browser text-size
preferences remain effective. Existing font-size declarations in the public,
authentication, investor and administrator styles reference these shared roles.
Inline journal and currency-control sizes use the same variables. Small text
painted into images, video, the 3D card artwork, and decorative logo glyphs is
not enlarged; those are artwork, not reading or interface text. The existing
downloadable company-profile PDF is unchanged.

`app/typography-layout.css` gives the larger text room: navigation spacing and
responsive menus, wrapping action rows, taller inputs, flexible panel headers,
wrapping buttons and search fields, single-column narrow-screen financial
cards, and taller footer-logo rows. Translated navigation uses a menu sooner
instead of reducing the text size. Operations cards and headers also adapt to
small screens. Horizontal scrolling remains available inside data tables.

The external-resource caption retains its wording, color and 70% opacity;
its size participates in the new scale. Reference logos, their order and static,
non-clickable behavior are unchanged. No financial calculations, addresses,
permissions, authentication requirements or transaction behavior are modified.

Visual checks use browser-only API responses for populated public and private
views. They do not create accounts, balances, transactions, applications, emails,
backups or approvals on the server. Separate existing browser cases exercise
deposit QR destinations and instructions, large investment values, card forms,
and administrator operations using their own isolated API fixtures.

## Validation

The production build and six localization cases pass. The final browser pass
covers 28 routes and 400 sampled states: English/Arabic layouts on public,
authentication, investor and administrator pages at 1366/768/390/320px, public
dark/light themes, plus all eight languages on homepage/deposit navigation
including opened mobile menus. It reports no page overflow, unexpected heading
sizes or page errors. Reading copy measures 18px; sign-in inputs and buttons
measure 16px. All 18 existing isolated browser cases for cards, deposits,
investment-value displays and operations pass.

Earlier passes identified narrow action rows, search controls, long translated
footer labels and operations cards that needed wrapping. These are corrected.
The visual checker waits for fonts and resize layout to settle before measuring
viewport-unit sizes; the sign-in page checks target its main fields explicitly,
since the passkey form also contains an email input. No application accounts or
financial records are created by these checks. Live deployment verification is
recorded separately in `LIVE_PREVIEW.md` and `VALIDATION.md`.
