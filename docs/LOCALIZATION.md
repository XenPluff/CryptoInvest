# Website languages

The interface supports English (`en`), French (`fr`), German (`de`), Spanish (`es`),
Italian (`it`), Russian (`ru`), Ukrainian (`uk`) and Arabic (`ar`). The selector is
available in public/authentication navigation and both workspaces. A validated
browser preference persists across navigation and reloads. Arabic sets `lang=ar`
and `dir=rtl`, with logical spacing, a right-side workspace sidebar, mirrored
navigation arrows and isolated addresses/codes. Other languages restore LTR.

Public pages, sector descriptions, plans, guides/transcripts shown on the page,
legal disclosures, browser tab titles, account forms, investor/admin controls, registered API feedback,
status labels and accessibility text share the translation system. Route metadata
stays in server layouts, while page content responds to language changes. The
404 page also includes the selector and translated navigation.

## Content and privacy boundaries

- The 2,307 registered source messages have seven bundled translation catalogs.
  Homepage headlines have dedicated wording and word order for every language. Each catalog is loaded on demand from this application. There is no runtime
  external translation request and no account content is sent to a translator.
- `TranslatedContent` translates React text/presentation attributes without DOM
  mutation. Routes, IDs, classes, event handlers, field values, API status enums,
  and submitted option values are preserved. Primitive child slots stay stable
  while text changes, preserving mounted form controls. `Verbatim`, `translate=no`,
  code/pre blocks, and input/default values protect records and identifiers.
- Company/product names, receiving destinations, hashes, references and private
  names/messages retain their source values. Unknown operator-authored journal
  content or runtime feedback stays in its original language until localized
  copy is supplied. Catalog parameters interpolate values without changing them.
- Money and date formatting can follow the selected language, while the ledger,
  plan limits and API amounts remain USD. Precise illustrative investment displays
  retain their explicit USD representation and never create posted funds.
- The existing PDF, image artwork, MP4 files, downloadable transcripts, native
  English caption files and outgoing emails are unchanged. The website identifies
  English publication/video assets accurately; displayed guide text is localized.
  Browser-native controls and validation follow the browser's own language.
- Translated legal pages retain risk, program-scope and pending-operator disclosures,
  and identify the English documents as the original. Translation is not a legal
  review or financial assurance. New catalogs use automated translation with
  focused checks; no independent native-language certification is claimed.

## Updating copy

Run `npm run translations:extract` to refresh `lib/locales/source.json`, then
`npm run translations:build` to populate missing messages. The optional build-time
script sends **static interface source text only** to Google's translation endpoint;
it is not run during normal production startup or page requests. Existing curated
French copy is retained. Review changes before committing them. Do not supply
account records, credentials, customer documents or user-entered text to this tool.

Run `npx vitest run tests/i18n.test.ts`, a production build, and
`npx playwright test tests/e2e/localization.spec.ts` against the built application.
Unit checks cover complete catalogs, template parameters, unchanged disclosed rates,
prototype-shaped inputs, validated persistence and rapid-selection races. Browser
checks cover all 25 public/404 routes in seven non-English languages, translated
headings and registered body-copy coverage, saved preferences, narrow layouts,
Arabic direction, unchanged private names, deposit payloads, administrator option
values, registration-field preservation and all five videos’ translated chapter headings. Workspace API data in these tests is
browser-only fixture data; no production account or financial record is changed.
