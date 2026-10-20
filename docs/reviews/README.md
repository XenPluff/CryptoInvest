# Independent review coordination

Prepared October 20, 2026. These are engagement briefs and a factual evidence
index, not independent audit reports, legal opinions, or launch approval.

| Workstream | Current state |
| --- | --- |
| Application security review | Brief prepared; three candidate firms verified through official websites; no firm engaged |
| Jurisdiction-specific investment/legal review | Brief prepared; operating entity, investor countries, and investor categories still needed before selecting local counsel |
| Budget and timing | Awaiting owner input; no quote, retainer, paid engagement, or appointment agreed |
| Outreach | Drafts prepared; no external messages or contact-form submissions sent |
| Testing | No third-party testing authorized or performed through this coordination work |

## Review materials

- [Security brief and access rules](SECURITY_BRIEF.md)
- [Investment offering and legal brief](LEGAL_BRIEF.md)
- [EU and already-launched operations addendum](EU_AND_LIVE_OPERATIONS.md)
- [Verified candidates and outreach drafts](PROVIDERS_AND_OUTREACH.md)

## Facts to confirm with the owner

1. Operating/registered country and legal entity; if not incorporated, where the
   owner plans to establish and operate the business.
2. Intended investor countries, including marketing locations, and whether the
   offering targets the public/retail investors or a restricted professional or
   accredited group. These labels need local counsel's interpretation.
3. Review budget, currency, intended launch date, and authorized engagement
   representative. Confirm whether the budget covers remediation and retesting.
4. Actual investment strategy, counterparties, asset segregation, yield source,
   liquidity arrangements, fees, investor rights, and evidence supporting return
   claims. Source code does not establish these business facts.

Provide incorporation documents, beneficial-owner information, commercial
agreements, financial records, and personal data directly to retained reviewers
through their secure intake channel. Do not commit them to this public repository
or paste identity documents, credentials, private keys, or recovery keys into chat.

## Coordination sequence

Confirm the business facts and budget, obtain conflict/independence checks and
written quotes, then have the owner approve concrete engagement terms. Establish
a separate staging environment and signed security rules of engagement before
testing. Have locally qualified counsel assess the offering before finalizing
investor documents or permitted-country controls. Track required changes, obtain
an independent security retest, and retain counsel's final country-by-country
advice and the owner's launch decision in a private record system.

The existing funding configuration and receiving addresses have not been changed
by preparing these materials. Their current state is not a legal launch decision.

## Evidence baseline

- Application: <https://aureon-preview.onrender.com>.
- Repository: <https://github.com/XenPluff/CryptoInvest>, deployment branch
  `codex/aureon-render-preview`.
- Recorded running application source:
  `e327463f1a0212d83faf391cea9d16beb61e6fb9`.
- Repository HEAD when preparing the briefs:
  `f9fc5658f8e6c6b9176a7c4cd9a93147792036dc` (later changes at that point were
  documentation). Confirm the actual deployed commit again at engagement start.
- Independent uptime workflow is on `main`; its source and permissions need to
  be included separately in the security review.

| Evidence | Purpose and limits |
| --- | --- |
| [Feature status](../FEATURE_STATUS.md) | Implemented product behavior and known external prerequisites |
| [Backend operations](../BACKEND_OPERATIONS.md) | Ledger, attribution, review, payout and settlement procedures |
| [API contract](../../lib/contracts.md) | Authentication, account, financial, admin and backup endpoints |
| [Schema](../../prisma/schema.prisma) and [migrations](../../prisma/migrations/) | Data relationships, constraints, history protection and deployment changes |
| [Plan seed](../../prisma/seed.ts) | Initial plan parameters and supplied receiving addresses; live plan settings may differ |
| [Validation record](../VALIDATION.md) | Developer test results, skipped cases, external limits and a previously recorded teardown flake; not independent assurance |
| [Backup recovery](../BACKUP_RECOVERY.md) and [operations](../OPERATIONAL_ALERTS.md) | Implemented tools, actual configuration prerequisites and monitoring limits |
| [Cloudflare setup](../CLOUDFLARE_SETUP.md) | R2 account authorization and private storage remain unconfigured in the recorded state |
| [Terms](../../app/legal/terms/page.tsx), [risk](../../app/legal/risk/page.tsx), [privacy](../../app/legal/privacy/page.tsx), [AML](../../app/legal/aml/page.tsx) | Current public copy to assess and replace with approved jurisdiction-specific documents |

Keep quotes, signed contracts, findings, exploit evidence, legal opinions and
remediation records private. No independent reviewer should be described as
having approved AUREON until its actual written scope and results support that
statement; publication of its name or report requires its permission.
