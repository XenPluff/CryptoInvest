# Orbital globe concept

**Selected Obsidian concept is live** at <https://aureon-preview.onrender.com>.
The owner approved deployment on October 28, 2026. The globe label-removal deployment
`dep-dbh2op59el5s73ak2030` used source
`8d02274e3cc5781c8468ce7ea65392539bf5627f`. The current overall deployment is recorded in [Live preview](LIVE_PREVIEW.md).
The working/source branch is
`codex/aureon-orbital-globe`; the Render branch is `codex/aureon-render-preview`.

The hero replaces the angular crystal and wire cage with an obsidian globe,
champagne-gold continent lights, elevated surface arcs, three orbital tracks,
moving light trails, sparse particles and a subtle blue rim. The globe slowly
rotates and responds gently to the pointer. This is illustrative artwork.

`HeroScene` renders the scene with React Three Fiber and Three.js. Lighting and
textures are generated locally; no external texture or environment request is
needed. `HeroArtwork` animates on desktop and mobile. It uses the matching transparent
renderer capture with reduced motion, while hidden, or outside the viewport.
The same poster is used if WebGL fails, with a simple SVG as a last-resort image
fallback. Compact canvases render at device pixel ratio 1; larger canvases cap
at 1.5 to limit GPU cost.

The 5,482 land samples in `lib/orbital-land.json` were generated from the
[public-domain Natural Earth 1:110m land geometry](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson).
No geographic data is fetched at runtime.

Review artifacts are in `.aureon/orbit-preview/` (ignored local output):

- `aureon-orbital-globe-preview.png`: isolated scene.
- `aureon-orbital-globe-animation.mp4`: 12-second animation capture.
- `aureon-homepage-preview.png`: actual production-build homepage integration.
- `aureon-mobile-preview.png`: small-screen poster integration.
- `aureon-light-preview.png`: light-theme integration.
- `check-result.json`: focused browser verification.
- `build.log`: successful production build, including client/server type checks.

The public poster is `public/images/hero/aureon-orbital-globe.png` (900×900,
transparent PNG). Preview capture scripts, fixture requests and videos are local
review tooling, not public app routes. Browser review uses isolated GET-only API
responses and does not create production records or send emails.

Validation passed: production build and nine focused browser checks, including
changing animation frames, pointer rendering, offscreen teardown/resume,
reduced-motion poster, decoded mobile poster, overflow at 768/390/320px and
light-theme rendering. No page errors or API mutations occurred. Browser
checks allow extra teardown time for the software WebGL renderer.

## Additional review options

Two more working 3D concepts are implemented in `GlobeConcepts.tsx`, with their
own review canvas in `GlobeConceptScene.tsx`. These files are not imported by the
homepage; the original draft integration and poster remain unchanged.

- **02 — Solaris:** a suspended faceted gold core, precision marks and three
  sculptural metallic rings with travelling light segments.
- **03 — Nexus:** a geometric lattice sphere, two wave-shaped gold/cyan ribbons,
  a moving scan ring and orbital beacons.

The first concept is labelled **01 — Obsidian** on the comparison sheet. Local
review artifacts in `.aureon/orbit-preview/` now also include:

- `aureon-three-concepts.png`: comparison of all three directions.
- `aureon-solaris-preview.png` / `aureon-nexus-preview.png`: individual stills.
- `aureon-solaris-animation.mp4` / `aureon-nexus-animation.mp4`: 12-second videos.
- `aureon-solaris-transparent.png` / `aureon-nexus-transparent.png`: transparent
  renderer captures for possible poster integration after selection.
- `options-result.json`: both scenes render without page or shader errors,
  advance animation frames, render pointer response and fit a compact canvas.
- `options-typecheck.log`: client TypeScript verification.

The owner selected **01 — Obsidian**, which is deployed.
Solaris and Nexus remain isolated review components, unmounted by the homepage.


## Selected Obsidian with cryptocurrency appearances

The selected scene now includes three small decorative cryptocurrency logos.
Each follows a two-second CSS animation, fades completely out before its next
appearance, and receives a new random symbol and position. The cycles are
staggered; concurrent symbols do not duplicate and placement favors separation.
The fixed three-element pool prevents accumulating nodes or timers. Its local
state updates do not rerender the Three.js canvas or interrupt the globe clock.

Seven locally bundled assets (BTC, ETH, SOL, USDT, USDC, BNB and XRP) come from
[cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons/tree/master/svg/color).
The source CC0 license is preserved at `public/images/crypto/LICENSE.txt`.
No remote logo requests are made at runtime. The logos are non-interactive
decoration, hidden from assistive technology. They stop with the globe offscreen
or when the document is hidden. Reduced motion retains the static poster
without flashing logos. Mobile now runs the actual 3D scene.

New local review artifacts:

- `obsidian-crypto-animation.mp4`: updated isolated desktop animation.
- `obsidian-crypto-mobile-animation.mp4`: actual mobile homepage animation.
- `obsidian-crypto-homepage.png` / `obsidian-crypto-mobile.png`: homepage stills.
- `obsidian-crypto-mobile-detail.png`: closer mobile capture at device scale 2.
- `obsidian-crypto-check-result.json`: nine focused browser checks, no page
  errors or API mutations. Verifies seven decoded assets, two-second CSS timing,
  fade-out, random cycles, animation at 1440/390/320px, reduced motion, the
  hidden-document event handler and offscreen teardown.
- `obsidian-crypto-build.log`: passing production build and type checks.

The mobile recording additionally verifies a render pixel ratio of 1 on an
emulated device with device scale 2. Software WebGL checks allow event-delivery
slack; a strict wall-clock cycle sample initially arrived before every queued
iteration event, so verification polls for completed cycles while separately
checking the exact 2,000ms CSS duration and fully transparent ending phase.
This is not a frame-rate measurement on physical mobile hardware.

The owner approved this updated version for deployment. The selected scene is
now live; Solaris and Nexus are not mounted or shown on the website.


## Hosted deployment verification

Deployment `dep-dbh23ucs728c73ckj8jg` became live with the exact approved source
`260851fbf3cd664d024c1ff88cf9c94b2677d1b3`. The hosted browser run repeats all
nine focused checks against actual HTML, immutable assets and read-only GET
APIs, with no API fixtures, page errors, failed requests or production mutations.
It covers 1440/390/320px animation and fit, two-second CSS duration and fade-out,
random logo cycles, reduced motion, hidden-document handler and offscreen teardown.
The synthetic visibility test initially hit a TypeScript-loader serialization
helper in its browser-evaluated callback. Passing the browser-only callback as
a plain JavaScript string fixed the verification script; the complete rerun
passed, without changing deployed source.

All seven cryptocurrency SVGs and the transparent globe poster match their
local source SHA-256 hashes over verified HTTPS. Public health is HTTP 200,
database connected, funding enabled and email readiness `checks_passed`.
Results are `.aureon/validation/obsidian-hosted-check-result.json` and
`obsidian-hosted-assets.json`; hosted screenshots are
`.aureon/orbit-preview/obsidian-crypto-hosted-homepage.png` and
`obsidian-crypto-hosted-mobile.png`.

Automatic Render deployments remain disabled. Documentation commits after the
source above do not change the running deployment.


## Decorative label removal

The owner's requested label removal is live in deployment `dep-dbh2op59el5s73ak2030`
with source `8d02274e3cc5781c8468ce7ea65392539bf5627f`. The top plus sign and
“PRECISION IN EVERY ORBIT / THE AUREON SPHERE — 001”, geographic coordinates,
and “THE LONG VIEW ↗” are removed from `Landing`. The decorative scene wrapper
has `aria-hidden="true"` inside the existing labelled artwork. The renderer
remains in place for the animation, with no separately exposed “canvas” detail
or visible canvas text. The bottom “A WORLD OF POSSIBILITY.” caption is retained.

Production build and ten focused local/hosted checks pass: removed text and
semantics, seven decoded logos, two-second appearance/fade, randomized cycles,
advancing animation and fitted layouts at 1440/390/320px, reduced motion, the
hidden-document event handler and offscreen teardown. Hosted checks use actual
HTML, assets and GET APIs, without fixtures, page errors, request failures or
mutations. Eight image hashes match source; public health reports connected
database, enabled funding and passed email readiness.

Results: `.aureon/validation/globe-label-removal-hosted-check-result.json` and
`globe-label-removal-hosted-assets.json`. Hosted screenshots:
`.aureon/orbit-preview/globe-label-removal-hosted-homepage.png` and
`globe-label-removal-hosted-mobile.png`.
