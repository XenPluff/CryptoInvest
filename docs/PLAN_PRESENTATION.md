# Investment plan presentation

The plan cards use a shared sculptural gallery treatment across the homepage,
public catalogue and investor workspace. Frames have a large asymmetric corner,
a fine inset border, a coloured edge marker and a restrained surface tint.
Starter uses blue-grey, Elite mineral green, Gold warm gold, Platinum lilac and
Shareholder bronze. Existing typography tokens and theme colours remain in use.

Each tier has a different static, projected mathematical surface rendered in
SVG: a twisted shell, a folded loop, a half-twist ribbon, a waisted surface and
a knotted loop. Decorative artwork is hidden from assistive technology, has
no focus targets, requires no image fetch or canvas and runs no animation loop.
Hover adds a small artwork shift; reduced motion removes that movement.
Buttons retain visible focus indicators and at least a 48px target height.

The homepage uses a staggered three-card arrangement on large screens. The
public daily catalogue uses two columns, with the longer monthly plan below;
mobile layouts become a single column with prominent artwork above the terms.
The investor workspace retains its existing responsive desktop grid and uses
one column on small screens. It keeps the workspace's dark panel colours.

## Published terms and interactions

The homepage previously used fixed example amounts, rates and durations which
had diverged from the operator's public plan records. Its replacement loads
`GET /api/plans` and displays the first three active daily plans. Loading,
empty and retryable error states do not substitute stale example rates.
Names, ranges, rates and durations come from the published records; the public
catalogue and workspace continue to use the same endpoint. The homepage keeps
its existing introductory descriptions for the original tiers.

Homepage links point to actual plan anchors in `/plans`; catalogue links retain
`/register?plan=<slug>`. Investor buttons retain funding availability, the existing
investment dialog, exact amount limits and account/identity requirements. Risk
and illustrative-rate text remains. No backend plan parameter, investment,
settlement, receiving wallet or ledger record is changed by this design.

## Verification scope

A production build, language catalogue checks and an outage/retry regression
cover the new homepage data source. Responsive browser review covers all eight
languages, dark/light settings, desktop/tablet/mobile widths and reduced motion.
All five investor dialogs and funding-disabled buttons are exercised using
browser-only account/health fixtures; no financial submission is made. Public
plan figures come from actual read-only published responses. Local software-GPU
screenshot artifacts were eliminated by reviewing CPU-rendered browser captures;
the product artwork itself remains static browser SVG.

Deployment-specific source, checks and artifacts are recorded in
[LIVE_PREVIEW.md](LIVE_PREVIEW.md) and [VALIDATION.md](VALIDATION.md).
