# PRD - CO-397 docs freshness owned fallback expiry

## Traceability
- Linear issue: `CO-397` / `3b516fb7-dd94-4ca6-abb9-81edf906a1ba`
- Linear URL: https://linear.app/asabeko/issue/CO-397
- Task id: `linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba`
- Canonical spec: `tasks/specs/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- Task checklist: `tasks/tasks-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- Source note: this packet was prepared from current `origin/main` plus the parent-provided CO-397 issue context. It does not query or transition Linear.
- Policy note: `docs/guides/fallback-expiry-and-refactor-policy.md` is authoritative for the `docs freshness ownership` follow-up created by CO-382.

## Summary
- Problem Statement: `docs:freshness` and `docs:freshness:maintain` can treat historical rolling debt as usable owner-backed debt only when ownership is current. CO-397 is blocked in Backlog until it has a packet that applies CO-382 `fallback expiry` discipline to docs freshness ownership, especially the `rolling_freshness_cohorts.owner_issue` path.
- Desired Outcome: create the CO-397 docs-first packet and mirrors before implementation, then have the parent lane verify that configured rolling freshness owners are live, same-project, and non-terminal before `pass_with_owned_rolling_debt` or equivalent owned debt decisions are allowed.

## User Request Translation
- User intent / needs: apply the CO-382 fallback-expiry policy to docs freshness ownership. The implementation must verify `rolling_freshness_cohorts.owner_issue` points to a live same-project non-terminal owner before owned rolling debt is considered usable. If the configured owner is terminal, canceled, duplicate, out-of-project, or unverifiable, the helper must reuse or create the canonical `docs:freshness:maintain` owner and intentionally re-home `docs/docs-catalog.json` owner guidance.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror exist for `linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba`
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` contain consistent CO-397 entries
  - packet preserves the protected terms and exact surfaces named by the issue
  - packet includes the CO-382 fallback expiry decision table for docs freshness ownership
  - parent implementation records owner verification and owner re-home behavior without weakening freshness/spec guard policy
  - focused docs validation runs at least `npm run docs:check` and `npm run docs:freshness` for this packet lane
- Constraints / non-goals:
  - no runtime/provider/control-host implementation in this worker lane
  - no `scripts/docs-freshness-maintain.mjs`, test, `docs/docs-catalog.json`, or `docs/guides/docs-freshness-cohorts.md` edits in this worker lane
  - no Linear state transition, workpad mutation, push, PR, or merge

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-397`
  - `CO: cap docs freshness owned fallback expiry`
  - `docs freshness ownership`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
  - `docs:freshness:maintain`
  - `rolling_freshness_cohorts.owner_issue`
  - `configured_owner_terminal`
  - `same-project live owner`
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/docs-freshness.mjs`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `docs/docs-freshness-registry.json`
  - `rolling_freshness_cohorts.owner_issue`
  - `pass_with_owned_rolling_debt`
  - `owner_issue_verification`
  - `owner_issue_action`
  - `configured_owner_terminal`
  - `canonical_owner_issues`
- Nearby wrong interpretations to reject:
  - `blocking_changed_paths=[]` means rolling debt can pass without owner verification
  - terminal, canceled, duplicate, out-of-project, or unverifiable owner metadata is usable live owner evidence
  - the canonical owner key should be renamed away from `docs:freshness:maintain`
  - owned rolling debt should be hidden by widening `window_days`, `max_entries`, or `max_cohorts`
  - CO-397 is a broad docs freshness sweep or stale packet refresh
  - CO-397 should edit runtime, provider workflow, review wrapper, or control-host status surfaces

## Docs Freshness Ownership Classification

| Contract | Classification | Initial decision | Rationale | Validation expectation |
| --- | --- | --- | --- | --- |
| Eligible historical rolling debt inside the declared rolling window and caps | Temporary freshness debt deferral | expire fallback | The debt may be temporarily usable only while it is owned by a live same-project non-terminal issue and remains inside configured caps. It must expire through the existing window/cap mechanics and owner review. | `docs:freshness`, `docs:freshness:maintain`, and focused maintain tests prove `pass_with_owned_rolling_debt` only appears with valid owner evidence. |
| Treating `rolling_freshness_cohorts.owner_issue` as usable without live same-project verification | Unsafe owner fallback | remove fallback | A configured string is not enough owner evidence. Terminal, canceled, duplicate, out-of-project, or unverifiable owners must fail closed and must not make rolling debt usable. | Maintain tests cover `configured_owner_terminal`, canceled, duplicate, out-of-project, unavailable helper, and same-project live owner outcomes. |
| Reusing or creating the canonical `docs:freshness:maintain` owner and re-homing `docs/docs-catalog.json` guidance | Durable ownership recovery contract | justify retaining fallback | The recovery path prevents duplicate issue churn and keeps maintenance ownership auditable. It is a supported owner-resolution contract, not a hidden waiver. | Tests and docs prove `docs:freshness:maintain` remains the canonical owner key and owner guidance is updated intentionally. |

## CO-382 Fallback Metadata

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs freshness ownership` | `pass_with_owned_rolling_debt` for eligible historical rolling cohorts | expire fallback | live same-project owner from `rolling_freshness_cohorts.owner_issue` or exact canonical owner mapping | `docs:freshness:maintain` sees stale declared baseline rows that are eligible, inside `window_days`, within `max_entries` / `max_cohorts`, and the current diff has no blocking freshness paths. | oldest known 2026-04-14; current review 2026-04-27 | driven by `expires_after` / next maintenance owner review | 7 days after normal cadence expiry under current policy | refresh, archive, reclassify, or create a refreshed same-project owner before the rolling window expires; expired debt blocks handoff. | `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, and focused maintain tests. |
| `docs freshness ownership` | configured `rolling_freshness_cohorts.owner_issue` accepted without live same-project non-terminal verification | remove fallback | `CO-397` | The policy has an owner string but live verification is missing, terminal, canceled, duplicate, out-of-project, or unverifiable. | oldest known 2026-04-22 owner-reset behavior; current review 2026-04-27 | N/A after removal | N/A after removal | owned rolling debt is usable only after live same-project non-terminal verification or intentional canonical owner re-home. | Focused tests for `configured_owner_terminal`, canceled, duplicate, out-of-project, unverifiable, and live same-project owner cases. |
| `docs freshness ownership` | canonical `docs:freshness:maintain` owner reuse/create and `docs/docs-catalog.json` owner guidance re-home | justify retaining fallback | `docs:freshness:maintain` / CO-397 parent lane | Configured owner is terminal, canceled, duplicate, out-of-project, or unverifiable while stale eligible debt still needs a maintenance owner. | oldest known 2026-04-22 owner reset; current review 2026-04-27 | 2026-05-26 | Non-expiring durable ownership recovery contract | Remove only if a replacement owner-resolution contract preserves same-project live-owner verification, duplicate prevention, and intentional catalog guidance. | Maintain tests, docs cohort guide updates, catalog JSON parse, and `docs:freshness:maintain` evidence. |

## Large-Refactor Check
- `large refactor`: not selected for this packet lane. The requested change tightens owner validity for an existing docs freshness ownership path instead of adding a new owner model.
- `minor seam`: acceptable only if the parent implementation keeps one source of truth for owner verification, makes invalid configured owners fail closed, and does not broaden `canonical_owner_issues` beyond exact owner-key matches.
- Parent must revisit the large-refactor preference if implementation requires parallel owner resolution across unrelated lifecycle phases or adds another cached owner-status path.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `rolling_freshness_cohorts.owner_issue` | `docs/docs-catalog.json` carries the configured global rolling freshness owner issue. | CO-382 requires docs freshness ownership fallbacks to have owner, trigger, expiry cap, removal condition, and validation. | Configured owner is usable only when verified as a live same-project non-terminal owner; invalid configured owners produce `configured_owner_terminal` or equivalent fail-closed owner action. | Changing rolling cohort class eligibility or cap values. |
| `docs:freshness:maintain` | Maintenance decisions can produce `pass_with_owned_rolling_debt` for eligible in-window rows. | Owned rolling debt is a temporary fallback, not permanent freshness forgiveness. | Passing owned debt requires valid owner verification plus window/cap checks and records expiry evidence. | Broad stale docs refreshes or blind `last_review` bumps. |
| Canonical owner recovery | Existing guidance preserves `docs:freshness:maintain` as the canonical owner key. | Duplicate prevention should reuse/create one canonical owner path instead of scattering maintenance issues. | Invalid configured owners cause intentional reuse/create of the canonical `docs:freshness:maintain` owner and deliberate catalog guidance re-home. | Renaming the owner key or creating unrelated canonical keys. |
| Packet and registry mirrors | CO-397 packet and registry mirrors are absent at lane start. | Backlog follow-ups from CO-382 need docs-first packets before implementation. | Packet and mirrors exist under the required `linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba` prefix. | Runtime/provider/control-host implementation. |

## Not Done If
- The packet omits any protected term: `docs freshness ownership`, `fallback expiry`, `large refactor`, `minor seam`, `remove fallback`, `expire fallback`, `justify retaining fallback`, `docs:freshness:maintain`, `rolling_freshness_cohorts.owner_issue`, `configured_owner_terminal`, or `same-project live owner`.
- The plan allows terminal, canceled, duplicate, out-of-project, or unverifiable owner metadata to make owned rolling debt usable.
- The plan treats `blocking_changed_paths=[]` as sufficient proof that rolling debt has a valid owner.
- The canonical owner key is renamed away from `docs:freshness:maintain`.
- The parent implementation widens rolling windows or caps instead of proving owner validity.
- This worker lane edits runtime/provider/control-host implementation, docs freshness scripts/tests, or `docs/docs-catalog.json`.
- CO-397 leaves Backlog before this packet and registry mirrors exist.

## Goals
- Create the CO-397 docs-first packet and mirrors.
- Preserve exact owner-verification terminology before implementation.
- Classify docs freshness ownership behavior under CO-382.
- Give the parent implementation a narrow validation contract for owned rolling debt and canonical owner recovery.

## Non-Goals
- No script, test, catalog, or guide implementation in this worker lane.
- No broad stale docs refresh.
- No changes to rolling cohort cap values, class eligibility, or archive policy.
- No Linear mutation, PR lifecycle, or merge.
- No provider workflow, review wrapper, runtime routing, or control-host status work.

## Stakeholders
- Product: CO operators relying on freshness gates to distinguish current-diff health from owned historical debt.
- Engineering: docs freshness maintainers, task registry owners, provider-worker review gates, and future CO-397 implementation lane.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - six CO-397 packet/checklist files exist
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the packet
  - protected terms appear across the packet
  - docs gates parse and validate the new packet
- Guardrails / Error Budgets:
  - zero edits outside declared packet and registry mirror scope
  - zero implementation files touched
  - zero Linear state mutations
  - zero freshness-policy weakening

## Technical Considerations
- Architectural Notes:
  - `docs/docs-catalog.json` remains the owner source for `rolling_freshness_cohorts.owner_issue`.
  - `scripts/docs-freshness-maintain.mjs` is the parent-owned implementation surface for owner verification, decision output, and recommended action.
  - `docs/guides/docs-freshness-cohorts.md` must describe invalid configured-owner handling and canonical owner recovery after implementation.
  - Exact canonical owner mappings must remain narrower than global owner evidence.
- Dependencies / Integrations:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - `tests/docs-freshness-maintain.spec.ts`
  - `tests/docs-freshness.spec.ts`
  - `tests/spec-guard.spec.ts`

## Validation Plan
- Prep lane:
  - JSON parse checks for edited registries
  - protected-term scan over CO-397 packet files
  - `npm run docs:check`
  - `npm run docs:freshness`
  - scoped diff/status check to confirm only declared packet and mirror files changed
- Parent implementation lane:
  - docs-review before implementation
  - focused `docs-freshness-maintain` tests for terminal, canceled, duplicate, out-of-project, unverifiable, and live same-project owner cases
  - focused `docs:freshness` / `spec-guard` checks if report owner metadata changes
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - normal parent validation, standalone review, elegance review, PR lifecycle, and Linear state handling

## Open Questions
- Should the parent implementation add a distinct machine-readable reason for out-of-project or unverifiable configured owners, or keep those under an existing fail-closed owner verification shape while preserving `configured_owner_terminal` for terminal states?

## Approvals
- Product: parent CO-397 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
