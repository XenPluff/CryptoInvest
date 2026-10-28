# Live preview

Website: <https://aureon-preview.onrender.com>

Latest deployment verified on October 28, 2026:

- Render service `aureon-preview` (`srv-dbb4i9o473hc73cjo9b0`) reports a live deploy.
- Running source commit: `e5aa6bd281c7893dcb8203d082f4c266dc725941` from branch
  `codex/aureon-render-preview`.
- The redesigned investor portfolio and consistent realized-earnings totals are
  live in deployment `dep-dbh7cn7lk1mc73an6log`. My Investments now has posted
  earnings/active principal/returned principal/settled-position totals, filters,
  search, dates and settlement details with net results. Overview and My
  Investments use shared integer-cent ledger calculations in repeatable-read
  snapshots. Both pages and analytics refresh every 15 seconds while visible,
  keeping existing data during background reads and marking temporary failures.
  Settled cards show actual proceeds; active targets remain estimates.
  Production build, 169 unit tests, 26 disposable-PostgreSQL checks and eight
  local browser cases are verified. Six hosted cases pass against actual
  deployed HTML/assets with browser-only account fixtures, covering earnings
  updates, failure recovery, filters, hidden tabs, authorization expiry and
  English/Arabic desktop/mobile fit. No production account or ledger records
  were changed by verification. Real portfolio, dashboard and analytics APIs
  return 401 without authentication; health remains connected, funding enabled
  and email readiness passed. See [portfolio behavior](INVESTOR_PORTFOLIO.md).
- The homepage “A global perspective” principle and its small globe icon are
  removed, along with their adjacent divider, in deployment `dep-dbh6p9uc6qcc73822ou0`.
  The remaining security principle, homepage artwork and CTA remain in place.
  Production build and focused local/hosted browser checks pass across twelve
  English/Arabic dark/light states at 1440/390/320px: no removed label/icon or
  orphaned divider, no overflow or page errors. Hosted HTML/assets and GET APIs
  are actual responses without fixtures or mutations; the unchanged external
  ticker is isolated. Health remains connected, funding enabled and email
  readiness passed. Results are in `.aureon/hero-global-removal/`.
- The Industry Resources row now uses solid white in both themes, deployed in
  `dep-dbh6gi0u01pc7389klqg`. Wordmarks render black and text dark green-grey
  for contrast. Original image files, order, connected tiles, non-clickable
  wrappers and continuous motion are retained. Production build and six
  local/hosted checks pass across twelve English/Arabic theme/width states,
  including exact background and contrast styles, decoding, fit, loop, hover,
  reduced motion and no navigation. Actual hosted GET checks use no fixtures,
  mutations or page errors, isolating the unchanged external ticker. Health
  remains connected with funding enabled and email readiness passed. See
  [current logo-row treatment](ORGANIZATION_LOGOS.md).
- Previously, the Industry Resources row used one shared white background at 10% opacity
  in both themes, deployed in `dep-dbh6acflk1mc73fcnmvg`. Transparent tiles
  remain connected and unclickable, with unchanged image files, order and
  continuous motion. Production build and six local/hosted checks pass across
  twelve English/Arabic dark/light states at 1440/390/320px, covering exact
  background color, decoding, fit, looping, reduced motion and no navigation.
  Actual hosted GET checks use no fixtures or mutations and report no page
  errors; the unchanged external ticker is isolated. Health remains connected
  with enabled funding and passed email readiness. See
  [current logo-row treatment](ORGANIZATION_LOGOS.md).
- Previously, the Industry Resources logo-row fill and border were removed in deployment
  `dep-dbh60pflk1mc73fbrnj0`. Its viewport and tiles are transparent in
  both themes; the ash theme override is removed. All 24 references remain
  unclickable, with 21 original images in unchanged order and continuous motion.
  Production build and six local/hosted checks pass across twelve English/
  Arabic theme/width states, verifying transparent backgrounds, zero row borders,
  fit, seamless looping, motion on hover, reduced motion and no click navigation
  or popups. Actual hosted GET checks use no API fixtures or mutations and have
  no page errors; the unrelated external ticker is isolated. Health remains
  connected with enabled funding and passed email readiness. See
  [current logo-row treatment](ORGANIZATION_LOGOS.md).
- The earlier Industry Resources row had one connected, translucent light-ash rail
  in deployment `dep-dbh5ko3l550s73c7pgi0`. Separate pale cards, gaps,
  borders and rounded corners are removed. All 24 logos/names are plain,
  non-interactive references with no links or keyboard targets. Original image
  files and order are preserved; dark-mode wordmarks use a light-grey display
  filter for readability. The continuous loop still advances on hover and
  reduced motion keeps static horizontal scrolling. Production build and six
  local/hosted checks pass across twelve English/Arabic theme/width states.
  All 21 images decode; tiles and loop groups meet without gaps, clicks open
  nothing, and there are no page errors, overflows or mutations. Hosted checks
  use actual GET APIs without fixtures and isolate this row from the unchanged
  external ticker. Health remains connected, funding enabled and email readiness
  passed. See [logo-row details](ORGANIZATION_LOGOS.md).
- The separate “Track all markets on TradingView” text link is removed in
  deployment `dep-dbh4qt59fdbs738c77j0`. Its 32px row and unused styles
  are removed; the 58px live iframe and native TradingView logo remain inside a
  compact 60px band. Production build and six local/hosted checks pass, covering
  all four real price streams, six desktop/mobile/theme states, continued quote
  updates and all eight language selections without a parent text link.
  Actual hosted HTML, GET APIs and provider responses pass without fixtures,
  page/provider/socket errors or mutations. Health remains connected with
  funding enabled and email readiness passed. See [ticker details](TRADINGVIEW.md).
- The homepage market band now uses TradingView's live Ticker Tape widget in
  deployment `dep-dbh40gbbc2fs73emb4ig`. Bitcoin, Ethereum and Tether use
  Coinbase USD pairs; BNB uses Binance USDT, with explicit pair labels. Native
  provider branding and linked, translated attribution remain visible. The old
  “FEED UNAVAILABLE” state, custom asset strip and homepage `/api/markets`
  polling are removed. Other market views and deposit pricing are unchanged.
  A provider-origin iframe matches the site's theme and supported widget
  locale; only its exact frame origin is added to the first-party CSP.
  Production build and six localization/catalog cases pass. Local and hosted
  browser checks verify real provider prices and live updates, six desktop/
  mobile/theme states, advancing ticker content and all eight site languages.
  The hosted run observes 57 quote frames and 54 price updates without
  page, provider-request or socket errors, API fixtures or mutations. Health
  remains connected with enabled funding and passed email readiness; the eight
  existing globe image hashes are unchanged. See [widget scope](TRADINGVIEW.md).
- The requested globe labels are removed in deployment `dep-dbh2op59el5s73ak2030`:
  the plus sign, “PRECISION IN EVERY ORBIT”, “THE AUREON SPHERE — 001”,
  geographic coordinates and “THE LONG VIEW ↗”. The decorative scene is hidden
  from accessibility tools inside the existing labelled artwork, so the renderer
  is not separately announced as “canvas”. The globe, random two-second crypto
  logo appearances and bottom “A WORLD OF POSSIBILITY.” caption remain.
  Production build and ten local/hosted browser checks pass, including label
  absence, renderer semantics and ongoing animation at 1440/390/320px. Actual
  hosted verification uses GET APIs without fixtures, page/request errors or
  mutations. All eight image hashes match; health remains connected, funding
  enabled and email readiness passed.
- The owner-selected Obsidian globe is live in deployment
  `dep-dbh23ucs728c73ckj8jg`. The dark metallic globe has gold continent lights,
  orbital trails and a subtle blue rim. Three decorative cryptocurrency logos
  continuously appear in random positions and fade fully out on staggered
  two-second cycles, choosing among seven local symbols without concurrent
  duplicates. The actual 3D globe animates on desktop and mobile; compact canvases
  use pixel ratio 1. Reduced motion uses the matching poster without flashing
  logos, and hidden/offscreen artwork unmounts. Solaris and Nexus are unmounted
  review components. Production build and nine focused local browser checks pass.
  Actual hosted HTML, assets and GET APIs repeat all nine checks at
  1440/390/320px without page errors, request failures, fixtures or mutations.
  The poster and seven SVGs match source SHA-256 hashes. Health remains connected,
  funding enabled and email readiness passed. A verification-script serialization
  error in the synthetic hidden-document check was fixed and the full hosted
  check rerun successfully; no deployed source change was needed. See
  [globe implementation and previews](ORBITAL_GLOBE.md).
- The website-wide text scale is live in deployment `dep-dbgvvion74is73dh28dg`:
  18px reading copy, 16px navigation/buttons/controls, 12–14px supporting text,
  22px panel/card titles, responsive section headings up to 36px and main headings
  up to 48px. Public pages, sign-in forms and both workspaces use shared tokens.
  Layout updates support translated navigation, wrapped actions/search, inputs,
  long footer labels and narrow operations/financial cards. Existing artwork,
  branding, image files and the company-profile PDF are unchanged.
  The production build, six localization cases and all 18 existing isolated
  browser cases pass. Actual hosted HTML/assets pass the 28-route core in
  English/Arabic (352 states) and all-eight-language home/deposit navigation
  (48 states), totaling 400 sampled states without overflow or page errors.
  Browser-only API fixtures populate public/private views; no production account,
  transaction, email or backup is created. A page-load timeout in the initial
  navigation continuation was resolved by a focused verification retry with
  cached immutable assets and settled fonts/layout; no source change was needed.
  Real health remains connected with enabled funding and passed email readiness.
  See [text sizes and scope](TYPOGRAPHY.md).
- The “External resources” caption is at 30% transparency (70% opacity) in
  deployment `dep-dbgsvi9srm7s73enqtqg`. The caption alone has `opacity:.7`,
  using black in light mode and a readable subdued-grey result in dark mode.
  Actual hosted HTML/assets pass four desktop/mobile/theme states, exact computed
  opacity and base colors, the unchanged thirteen-reference grid and twelve
  original image hashes, static/non-clickable behavior and no former paragraph.
  No page errors, API fixtures or production mutations occurred. Health remains
  connected with enabled funding and passed email readiness. Text, translations
  and source images are unchanged.
- The “External resources” caption now uses faded black (65% black) in light
  mode and readable charcoal-grey (`#818181`) in dark mode, live in deployment
  `dep-dbgsqhgm7kps73eo3ki0`. Actual hosted HTML/assets pass four desktop/
  mobile/theme states with exact computed-color checks, the unchanged caption,
  thirteen references, twelve original image hashes, static/non-clickable
  behavior and no former paragraph. No page errors, API fixtures or production
  mutations occurred. Health remains connected with enabled funding and passed
  email readiness. Translations and source images are unchanged.
- A single muted-grey “External resources” label is live in deployment
  `dep-dbgsivh42hec73dubsg0`. It replaces the former heading and explanatory
  paragraph above/below the logo grid. Both former lines are absent from the
  rendered figure; the new caption is translated across the site's languages.
  Actual hosted HTML/assets pass sixteen English/Arabic theme/width states,
  caption text and computed grey colors, no paragraph, the unchanged thirteen
  references and twelve image hashes, order, three columns and static,
  non-clickable behavior without page errors, API fixtures or production
  mutations. The browser check settles resize layout with reduced motion.
  Health remains connected with enabled funding and passed email readiness.
  Catalogs cover 2,377 messages.
- The compact ordered education-reference grid is live in deployment
  `dep-dbgs1poae00c73d97clg`. Thirteen references use three small columns,
  twelve official-source local logos and a readable CB Insights fallback name.
  Certification and award badges are not published; AICPA is not duplicated.
  The references remain static, non-clickable and background-free, with small
  names, the external-education heading and no-affiliation/endorsement note.
  Actual hosted HTML/assets pass all twelve source hashes, source order, three
  columns, no navigation or animations and 16 English/Arabic theme/width states,
  without API fixtures, page errors or production mutations. Both theme
  screenshots confirm the compact arrangement. Initial proxy status-read errors
  recovered; an initial width assertion timeout did not recur in the diagnostic
  run, without code changes. Health remains connected with enabled funding and
  passed email readiness. Catalogs cover 2,378 messages.
- White backgrounds are removed from the footer education references in deployment
  `dep-dbgqrrfb9u1s7391pomg`. Tiles are transparent with no borders. ESMA's
  embedded white matte blends into each theme, and ISO's white outer margin is
  clipped without removing its red field or white letters. Wordmarks render
  lighter in dark mode; light mode retains their colors. Actual hosted HTML/assets
  pass 16 English/Arabic theme/width states, transparent tile styles, decoding,
  no click navigation or animation, and all five unchanged source-image hashes.
  Both hosted theme screenshots show background-free presentation, without page
  errors, API fixtures or production mutations. Health remains connected with
  enabled funding and passed email readiness. Labels and the external-education
  context remain unchanged.
- The standard ISO organization logo is live as the fifth education reference in
  deployment `dep-dbgqi3p42hec73dpgimg`. The original official-homepage PNG
  appears in the existing static, non-clickable footer section with its shared
  external-education heading and no-affiliation/endorsement note. The uploaded
  ISO 27001 Certified badge is not published. Actual hosted HTML/assets pass all
  five source-image hashes, decoding, no navigation or animations, and 16
  English/Arabic theme/width states without API fixtures, page errors or
  production mutations. Health remains connected with enabled funding and passed
  email readiness. Catalogs cover 2,383 messages; credential-logo data stays empty.
- The standard AICPA organization logo replaces the third footer education tile
  in deployment `dep-dbgqde8ae00c73d5hq00`. The exact official-site PNG loads
  beneath the existing external-education heading with the no-affiliation/
  endorsement note. No SOC assurance seal is published. Actual hosted HTML/assets
  pass all four source-image hashes, AICPA presence and Blockdaemon footer absence,
  no navigation or animations, and 16 English/Arabic theme/width states without
  API fixtures, page errors or production mutations. Health remains connected
  with enabled funding and passed email readiness. Catalogs cover 2,382 messages;
  the separate homepage Blockdaemon industry-resource reference is unchanged.
- Blockdaemon and ESMA education references are live in deployment
  `dep-dbgpujnlk1mc7396mfq0`. Four compact, static, non-clickable footer tiles
  use official-source local images under the external-education heading. The
  shared translated note clarifies that no affiliation or endorsement of AUREON
  is implied. Actual hosted HTML/assets pass all four original image hashes,
  decoding, no click navigation or animations, and 64 language/theme/width states
  without API fixtures, page errors or production mutations. Health remains
  connected with funding enabled and email readiness passed. Catalogs cover
  2,382 messages. Four unreadable attachments remain unidentified and unpublished;
  credential-logo data remains empty. See [footer scope](FOOTER_LOGOS.md).
- The additional SEC education logo is live in deployment `dep-dbgpi9ei0phs738lqgi0`.
  Two compact, static, non-clickable tiles beneath the footer tagline share the
  external-education heading and no-endorsement note. Actual hosted HTML/assets
  pass 64 language/theme/width states, both original image SHA-256 matches,
  decoding, no interactive elements or click navigation, and no animations or
  page errors. No API fixtures or production mutations were used. Health remains
  connected with enabled funding and passed email readiness. Catalogs cover
  2,380 messages. Credential-logo data remains empty.
- The static Investor.gov education resource is live beneath the footer tagline
  in deployment `dep-dbgougvlk1mc7394c0e0`. The exact supplied SEC-hosted PNG is
  compact and non-clickable, with a translated external-education heading and
  no-endorsement note. Actual hosted HTML/assets pass eight languages, two themes
  and four widths (64 states), original image SHA-256, no navigation or animations
  and no page errors, without API fixtures or production mutations. Health remains
  connected with funding enabled and email readiness passed. Credential-logo data
  remains empty; this resource makes no regulatory registration or endorsement
  claim. Catalogs cover 2,379 messages. See [footer scope](FOOTER_LOGOS.md).
- The [logo row](https://aureon-preview.onrender.com/#industry-resources) has no
  explanatory caption or play/pause controls in deployment
  `dep-dbgmrtuc6qcc73c4hec0`. Its animation keeps advancing on hover and keyboard
  focus, with seamless full-group wrap. Actual hosted HTML/assets pass 64
  language/theme/width states, all 21 image hashes, caption/control absence,
  hover/focus motion and card-section placement without API fixtures or page
  errors. Device reduced-motion preferences still use static horizontal
  scrolling. Health remains connected with enabled funding and passed email
  readiness; catalogs cover 2,375 messages.
- The compact [organization row](https://aureon-preview.onrender.com/#industry-resources)
  is live in deployment `dep-dbgmfnei0phs73aq6vcg`, directly before the card
  concept. Twenty-four identifiable external organization/publication references
  move together in one continuous horizontal loop. Twenty-one local image marks
  load and match their source-file SHA-256; three unavailable publication marks
  use readable names. Actual hosted HTML/assets pass eight languages, two themes
  and four widths (64 states), loop/wrap/pause, placement, duplicate accessibility
  and reduced-motion scrolling, without API fixtures or page errors. Health
  remains connected with enabled funding and passed email readiness. Catalogs
  cover 2,378 messages. The row explicitly identifies external resources;
  relationship/credential claims, certification/award/regulator badges and
  unreadable unidentified images remain pending supporting records/original
  files. See [asset and claim scope](ORGANIZATION_LOGOS.md).
- The [administrator deposit review](https://aureon-preview.onrender.com/admin/deposits)
  is simplified in deployment `dep-dbd8nm5g1s2s73ajp9qg`. Evidence-reference,
  ownership/source-of-funds evidence and written-note fields and their prompts
  are removed. Approval keeps the confirmed USD amount and current admin code;
  decline needs no note. Missing notes become a factual decision record, with
  no generated verification evidence. Actual hosted assets pass eight languages
  at 1440/390/320px (24 layout states), absent-field checks, required admin proof
  and approve/decline payloads with browser-only API fixtures. Withdrawal notes
  remain present. No production reviews or page errors occurred. Protected APIs
  return 401; health reports connected database, enabled funding and passed
  email readiness. Catalogs cover 2,373 messages.
- The [amount-first deposit flow](DEPOSIT_FLOW.md) is live in deployment
  `dep-dbd6gi3ncjis73ba3aj0`. Add funds and Deposit funds open USD entry,
  cryptocurrency/network selection and a current coin conversion. Proceed opens
  a centered payment window with fixed coin instructions, the original address,
  address QR code and separate copy actions. Returning users can resume after
  reload; Done reports the hash for manual review without investor MFA or
  immediate balance credit. Actual hosted guide copy, MP4/caption/transcript
  SHA-256 matches, byte ranges and unauthenticated API rejection pass. Hosted
  workspace assets pass 48 selection/payment language/width states, all six
  original QR destinations, clipboard actions, resume and pending submission
  with browser-only API fixtures. No production mutations or page errors
  occurred. Provider spot prices were read from this workspace; authenticated
  pricing from Render was not exercised with a real investor account. Health
  reports connected database, enabled funding and passed email readiness.
  Catalogs cover 2,378 messages; the English deposit guide follows the new flow.
- The [account two-factor policy](TWO_FACTOR_POLICY.md) is live in deployment
  `dep-dbcra33rjlhs73eer5rg`. Investor enrollment is optional, with codes at
  enabled login and withdrawal only; enrollment confirms one setup code.
  Administrator login, enrollment and every workspace mutation require
  authenticator protection. Existing investor preferences are preserved;
  administrators with previous non-MFA sessions must sign in again.
  Actual hosted public policy copy, all three updated guide films/captions/
  transcripts (matching SHA-256 and MP4 byte ranges), and unauthenticated API
  rejection pass. Hosted workspace assets pass 48 investor preference/language/
  width states, administrator code enforcement and enrollment-only screens
  using browser-only API fixtures. No production mutations or page errors
  occurred. Health reports connected database, enabled funding and passed
  email readiness. Catalogs cover 2,344 messages.
- [Strategic Business Investments](https://aureon-preview.onrender.com/approach#strategic-business)
  is live as activity 10 in deployment `dep-dbcqa85g1s2s73e5t1pg`. The exact
  supplied heading and three paragraphs follow AI/robotics, with an original
  1536×1024 picture containing only AUREON branding. Actual hosted HTML/assets
  pass eight languages at 1440/768/390/320px in both themes (64 layout states),
  navigation, image decoding, matching original-PNG SHA-256 and a complete
  ten-image homepage cycle with wraparound. No API fixtures or page errors
  occurred. Catalogs cover 2,338 messages. Health remains connected with
  enabled funding and passed email readiness. The homepage market feed returned
  503 during this check; live quote availability is not established by these
  content/media checks. The existing company-profile PDF edition is unchanged.
- The [AI and robotics profile](https://aureon-preview.onrender.com/approach#ai-robotics)
  is updated in deployment `dep-dbcploei0phs73fke110`. The supplied heading
  and three replacement paragraphs match exactly; the former three paragraphs
  are removed. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the AI/robotics
  artwork loads. Catalogs cover 2,330 messages. Health remains connected with
  enabled funding and passed email readiness.
- The [arbitrage profile](https://aureon-preview.onrender.com/approach#arbitrage)
  is updated in deployment `dep-dbcpehbncjis73d7aqfg`. The supplied heading
  and three replacement paragraphs match exactly; the former three paragraphs
  are removed. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the arbitrage
  artwork loads. Catalogs cover 2,329 messages. Health remains connected with
  enabled funding and passed email readiness.
- The [natural resources profile](https://aureon-preview.onrender.com/approach#natural-resources)
  is updated in deployment `dep-dbcp14jncjis73d62uq0`. The new heading and
  three paragraphs replace the former copy. The opening correctly refers to
  “precious and industrial metals (gold, silver and copper)”; the remaining
  wording follows the supplied text. Actual hosted HTML/assets pass eight
  languages at 1440/768/390/320px in both themes (64 layout states), without
  text overflow, API fixtures or page errors. All nine profiles remain and the
  metals artwork loads. Catalogs cover 2,328 messages. Health remains connected
  with enabled funding and passed email readiness.
- The [tangible physical assets profile](https://aureon-preview.onrender.com/approach#physical-assets)
  is updated in deployment `dep-dbcolldg1s2s73e11uk0`. The supplied heading
  and three replacement paragraphs match exactly; the former three paragraphs
  are removed. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the physical-assets
  artwork loads. Catalogs cover 2,327 messages. Health remains connected with
  enabled funding and passed email readiness.
- The [solar energy profile](https://aureon-preview.onrender.com/approach#solar-energy)
  is updated in deployment `dep-dbcoeiivcj2c73fbbtg0`. The supplied heading
  and three replacement paragraphs match exactly; the former three paragraphs
  are removed. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the solar artwork
  loads. Catalogs cover 2,326 messages. Health remains connected with enabled
  funding and passed email readiness.
- The [agriculture profile](https://aureon-preview.onrender.com/approach#agriculture)
  is updated in deployment `dep-dbco0smq1p3s73co8mbg`. The supplied heading
  and three replacement paragraphs match exactly; the former three paragraphs
  are removed. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the agriculture
  artwork loads. Catalogs cover 2,325 messages. Health remains connected with
  enabled funding and passed email readiness.
- The [real estate management profile](https://aureon-preview.onrender.com/approach#real-estate)
  is updated in deployment `dep-dbcnod6q1p3s73cnegbg`. The supplied heading
  and three replacement paragraphs match exactly; the former three paragraphs
  are removed. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the real-estate
  artwork loads. The initial hosted image check exceeded five seconds; a full
  rerun with a 20-second image allowance passed without asset HTTP errors.
  Catalogs cover 2,324 messages. Health remains connected with enabled funding
  and passed email readiness.
- The [financial market trading profile](https://aureon-preview.onrender.com/approach#market-trading)
  is updated in deployment `dep-dbcng7lg1s2s73dtbf3g`. The supplied heading
  and four replacement paragraphs match exactly; the former trading copy and
  experience panel are removed. Actual hosted HTML/assets pass eight languages
  at 1440/768/390/320px in both themes (64 layout states), without text overflow,
  API fixtures or page errors. All nine profiles remain and the trading image
  loads. An initial hosted language switch exceeded the checker’s five-second
  timeout; the complete rerun with a 20-second allowance passed without asset
  HTTP errors. Catalogs cover 2,323 messages. Health remains connected with
  enabled funding and passed email readiness.
- The [cryptocurrency mining profile](https://aureon-preview.onrender.com/approach#crypto-mining)
  is updated in deployment `dep-dbcn7teq1p3s73clvg8g`. The two requested
  introductory passages and three former mining paragraphs are removed.
  The supplied numbered heading and all four replacement paragraphs match
  exactly, including visible performance considerations and variable-revenue
  risk wording. Actual hosted HTML/assets pass eight languages at
  1440/768/390/320px in both themes (64 layout states), with no text overflow,
  API fixtures or page errors. All nine profiles remain, the mining image loads
  and catalogs cover 2,324 messages. Health remains connected with enabled
  funding and passed email readiness.
- The [About Aureon overview](https://aureon-preview.onrender.com/about#who-we-are)
  is live in deployment `dep-dbcmio6i0phs73fb65n0`. The supplied “Who We Are”
  wording and five-step approach appear immediately before “The idea behind
  Aureon.” All nine English paragraphs match the supplied text. Actual hosted
  HTML/assets pass eight languages at 1440/768/390/320px in both themes
  (64 layout states) without overflow, API fixtures or page errors. Catalogs
  now cover 2,322 messages. Health remains connected with enabled funding
  and passed email readiness.
- The eight-language interface is live in deployment `dep-dbch5t3rjlhs73bfis5g`.
  German, Spanish, Italian, Russian, Ukrainian and Arabic join English and French
  across public/authentication pages and investor/admin workspaces. Arabic uses
  RTL layouts; preferences persist and English restores LTR. The 2,307-message
  catalogs load on demand, with dedicated homepage headlines, translated guide
  chapters and browser titles. Actual hosted HTML/assets passed 56 route/language
  checks across seven non-English languages and 1440/390/320px layouts, including
  legal copy and English PDF/video identification. No API fixtures or page errors
  occurred; unauthenticated card/admin APIs remain 401. Health reports connected
  database, enabled funding and passed email readiness. Local workspace/form/QR
  checks used browser-only fixtures and created no production records. Original
  files, email and unknown freeform content retain their original language. See
  [language scope](LOCALIZATION.md).
- The [homepage investor perspective](https://aureon-preview.onrender.com/#investor-perspective)
  is live in deployment `dep-dbcg9u6ktt5c73cpto6g`, immediately after
  “Your next chapter” and before FAQ. Company-authored principles describe
  plan information, transaction visibility and account protection, with four
  working resource links. Actual hosted HTML/assets passed 1440/768/390/320px
  English/French dark/light layouts without API fixtures or page errors.
  Health remains connected, funding enabled and email readiness passed.
  No invented investor identities, testimonials, ratings, outcomes or worldwide
  impact claims were published.
- The [company profile](https://aureon-preview.onrender.com/company-profile)
  and [28-page PDF](https://aureon-preview.onrender.com/documents/aureon-company-profile.pdf)
  are live in deployment `dep-dbcf7dbl550s738u69l0`. All 15 existing website
  pictures and two new abstract brand visuals accompany the company overview,
  sector profiles, process diagrams, plan snapshot, product scope and risk/policy
  information. Hosted PDF SHA-256 matches the reviewed file and byte ranges
  return 206; actual hosted page/cover, About/footer links and 1440/390/320px
  English/French navigation in both themes passed without API fixtures or page
  errors. Native hosted Chromium download was canceled in the cloud checker;
  its hosted browser-save path is unverified. Local native browser download and
  hosted verified-HTTPS file integrity checks passed. Health remains connected,
  with funding enabled and passed email readiness. See [publication notes](COMPANY_PROFILE.md).
- The homepage's "Where value takes shape" picture slideshow is live in
  deployment `dep-dbcejr1kjs5s73a5pta0`. It cycles through all nine business
  pictures one at a time on a five-second interval, without pause/play controls.
  Actual hosted HTML/images passed a complete nine-picture cycle and wraparound,
  continued rotation while hovered, reduced-motion autoplay and 1440/390/320px
  layouts without API fixtures or page errors. Local browser cases also cover
  touchscreen autoplay, offscreen rotation and retaining the current picture
  after load failures. Reduced motion disables the fade, without stopping rotation.
- The homepage card picture caption is removed in deployment
  `dep-dbbuitfavr4c73dmjhfg`. Actual hosted image decoding, caption absence,
  links, placement after investment packages and 1440/390px layouts passed
  without API fixtures or page errors.
- Repeated "AI-generated sector illustration" picture captions are removed in
  deployment `dep-dbbue93l550s73e9mft0`. Actual hosted homepage, About and approach
  HTML confirm their absence; nine sector profiles and download links remain.
- The homepage card introduction is live in deployment `dep-dbbu6i8473hc73cide80`.
  Immediately after the investment packages, the original card artwork appears with an
  introductory copy, current pre-launch availability and
  links to the card designs and investor application page. Actual hosted
  section order, image decoding, links and 1440/390px layouts passed without API
  fixtures or page errors. Health remains
  connected with funding enabled and email readiness checks passed.
- [Card concepts](https://aureon-preview.onrender.com/cards),
  [investor applications](https://aureon-preview.onrender.com/dashboard/cards)
  and the [admin queue](https://aureon-preview.onrender.com/admin/cards) are live
  in deployment `dep-dbbtq92jtilc73aia0lg`. Branded Visa/Mastercard design
  preferences include interactive 3D front/back views and original concept
  artwork. Actual deployed HTML/assets, matching PNG SHA-256, both card views,
  1440/390/320px layouts and English/French public navigation passed without
  page errors. Workspace application and two-stage admin review checks used
  browser-only API fixtures; actual unauthenticated card APIs return 401.
  No production application, review, financial transaction or email was created
  by these checks. Startup completed with the additive application migration;
  health reports connected database, enabled funding and passed email readiness.
  This is a pre-launch application system. No licensed issuer or approved card
  program is connected; real card issuance, credit and worldwide payments remain
  unavailable. See [card program scope](CARD_PROGRAM.md).
- The [AI and robotics investment profile](https://aureon-preview.onrender.com/approach#ai-robotics)
  is live in deployment `dep-dbbt458m7kps73d5cv70`, bringing the collection to
  nine company-reported activities/investment interests. It includes an original
  AUREON-branded illustration and appears in the homepage list and About page.
  Actual hosted profile, caption, navigation, expandable evidence and
  1440/390/320px English/French layouts passed browser checks without API
  fixtures or page errors. All nine original PNG downloads match local SHA-256
  hashes. Health reports connected database, enabled funding and passed email
  readiness checks. Imagery and operating descriptions remain explicitly
  distinguished from independently verified ownership or investment results.
- [How value is generated](https://aureon-preview.onrender.com/approach) is live
  in deployment `dep-dbbs95ei0phs73e1ocs0`. Eight company-reported activity
  profiles include original AUREON-branded AI illustrations, revenue mechanics,
  costs, risks and supporting-record standards. The reported 7–15 years of trader
  experience is attributed to the company; business operations and credentials
  were not independently verified in this content task. Actual deployed images
  rendered successfully and all eight original downloads matched local SHA-256
  hashes. Source/AI labels, expandable evidence, homepage/About links and
  1440/390/320px English/French navigation layouts passed hosted browser checks
  without API fixtures or page errors, through the existing verified-TLS client.
- The [video library](https://aureon-preview.onrender.com/videos) is live in
  deployment `dep-dbbrh9gu01pc738prbp0`. Five actual MP4s cover the introduction,
  account setup, deposits, withdrawals and a short brand film, with ambient
  music, English captions, transcripts and downloads. The homepage and navigation
  link to the collection; deposit and withdrawal screens link to their guides.
  Actual deployed HTML/media passed browser playback, caption and chapter-seek
  checks without API fixtures, plus 1440/390/320px English/French navigation
  layouts and HTTP 206 media range checks. Resources were retrieved through the
  existing verified-TLS client because the cloud browser lacks the proxy CA.
  No real account, deposit, withdrawal or email was created by these checks.
- Homepage returns HTTP 200 and renders AUREON.
- `/api/health` returns HTTP 200, database `connected`, and funding enabled.
- [Operations & backups](https://aureon-preview.onrender.com/admin/operations)
  is live in deployment `dep-dbbp43nf3r2c73dt15dg`. The page returns 200 and its
  unauthenticated API returns 401. Hosted HTML/assets passed browser checks for
  local recovery-key generation, public-key-only submission, and 1440/390/320px
  layouts using browser-only account/operations fixtures. TLS verification was
  retained through the trusted HTTPS client; no real admin session or backup
  was created by that check. The owner still needs to generate/save a recovery
  kit and configure private storage to activate daily off-site backups.
- The independent GitHub monitor is active on `main`; manual run `39455326506`
  passed against the updated service. Scheduled checks and repository issues run
  outside Render; GitHub account notification preferences control outage email.
  See [backup setup](BACKUP_RECOVERY.md) and [alerts](OPERATIONAL_ALERTS.md).
- The redesigned [investor deposit page](https://aureon-preview.onrender.com/dashboard/wallets)
  is deployed in `dep-dbbo10nf3r2c738lcqrg`. It uses the unchanged wallet catalogue,
  with currency/network selection, local QR codes, address copying, authenticator
  submission, and recent deposit statuses. The deployed HTML/assets were checked
  in Chromium with browser-only account/wallet fixtures: all six QR destinations
  matched, 1440/390/320px layouts fit, and no page errors occurred. No live
  account or financial records were created by those checks.
- Email settings are present (`emailConfigured:true`), and the startup check from
  Render reports `emailDeliveryStatus:checks_passed` after the owner authorized
  the outbound IP ranges and restarted the service.
- The owner entered `BREVO_API_KEY` in Render alongside `EMAIL_PROVIDER=brevo`
  and `BREVO_SENDER_EMAIL=aurreon.support@gmail.com`. The read-only account check
  confirms transactional sending enabled and the matching sender active. Follow
  [email activation steps](EMAIL_DELIVERY.md) to test a real verification/reset
  email; provider readiness does not establish acceptance or inbox delivery.
- Public contact email: `aurreon.support@gmail.com`, supplied by the owner. The
  homepage footer and support page return HTTP 200 with working `mailto:` link
  destinations. The support form continues to save requests in the admin queue;
  publishing the inbox does not enable outbound account mail.
- The owner reports receiving the verification email, verifying their address,
  and signing in successfully. Password-reset inbox delivery is not confirmed.
- Administrator access is enabled for `aurreon.support@gmail.com`. The requested
  one-time promotion retry became live; normal startup is restored and temporary
  operator settings removed. The owner must sign in again and complete
  authenticator setup if needed. See [administrator setup](ADMIN_SETUP.md).

This is the actual provider-assigned HTTPS address, not a local address or a
guessed preview hostname. The owner completed the Render Blueprint deployment
through the dashboard after Cloudflare blocked workspace/database provisioning
API calls from the cloud environment. The service and database were requested on
the blueprint's free plans.

## Remaining account setup

Public pages can be viewed now. Brevo access and sender checks pass, and the
owner reports completing verification and sign-in. Recovery inbox delivery
remains unconfirmed. The preview
does not expose the development Mailpit inbox.

No default administrator credentials are created. Administrator access requires
the secure account-creation workflow and authenticator enrollment. Do not add a
public default password or bypass authentication to make the admin screens visible.

Financial controls use the supplied receiving wallet addresses and manual
deposit/payout verification. The application does not broadcast cryptocurrency
payments. Enabling funding does not seed balances, confirm transfers, or make
illustrative target returns withdrawable.

Automatic deploys are disabled. Later source/documentation commits do not change
the running service until an explicit deployment is requested. Check Render's
reported running commit and the actual HTTPS endpoints when validating updates.
