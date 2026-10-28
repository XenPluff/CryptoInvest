# Orbital globe concept

This is an **undeployed review draft** on `codex/aureon-orbital-globe`.
The live Render deployment has not been changed.

The hero replaces the angular crystal and wire cage with an obsidian globe,
champagne-gold continent lights, elevated surface arcs, three orbital tracks,
moving light trails, sparse particles and a subtle blue rim. The globe slowly
rotates and responds gently to the pointer. This is illustrative artwork.

`HeroScene` renders the scene with React Three Fiber and Three.js. Lighting and
textures are generated locally; no external texture or environment request is
needed. `HeroArtwork` uses the matching transparent renderer capture on small
screens, with reduced motion, while hidden, or outside the viewport. The same
poster is used if WebGL fails, with a simple SVG as a last-resort image fallback.

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

All alternatives remain undeployed. A selection is needed before integrating
an alternative into `HeroArtwork`; that integration will reuse its existing
mobile/reduced-motion and visibility behavior with the selected scene's poster.
