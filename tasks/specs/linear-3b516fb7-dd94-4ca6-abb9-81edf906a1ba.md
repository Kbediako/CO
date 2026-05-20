---
id: 20260427-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba
title: "CO-397 docs freshness owned fallback expiry"
relates_to: docs/PRD-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md
risk: high
owners:
  - Codex
last_review: 2026-05-20
related_action_plan: docs/ACTION_PLAN-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md
task_checklists:
  - tasks/tasks-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md
---

# TECH_SPEC - CO-397 docs freshness owned fallback expiry

## Canonical Reference
- PRD: `docs/PRD-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- Task checklist: `tasks/tasks-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- Linear issue: `CO-397` / https://linear.app/asabeko/issue/CO-397

## Summary
- Objective: register CO-397 before implementation and define the docs freshness ownership fallback-expiry contract for `rolling_freshness_cohorts.owner_issue`.
- Scope:
  - packet files, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows in this worker lane
  - parent-owned verification of `docs:freshness:maintain` owner resolution, owner re-home guidance, tests, and docs updates after this packet exists
- Constraints:
  - no runtime/provider/control-host implementation in this worker lane
  - no `scripts/docs-freshness-maintain.mjs`, tests, `docs/docs-catalog.json`, or freshness guide edits in this worker lane
  - no Linear transition or PR lifecycle work in this worker lane

## Issue-Shaping Contract
- User-request translation carried forward: CO-397 applies CO-382 `fallback expiry` to docs freshness ownership. Owned rolling debt must be usable only when `rolling_freshness_cohorts.owner_issue` resolves to a live same-project non-terminal owner, or when the parent intentionally reuses or creates the canonical `docs:freshness:maintain` owner and re-homes `docs/docs-catalog.json` guidance.
- Protected terms / exact artifact and surface names:
  - `docs freshness ownership`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `rolling_freshness_cohorts.owner_issue`
  - `configured_owner_terminal`
  - `same-project live owner`
  - `scripts/docs-freshness-maintain.mjs`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
- Nearby wrong interpretations to reject:
  - configured owner strings are enough owner evidence
  - `blocking_changed_paths=[]` is enough to pass with owned rolling debt
  - terminal, canceled, duplicate, out-of-project, or unverifiable owners can stay usable
  - `docs:freshness:maintain` should be renamed or replaced as the canonical owner key
  - rolling window/cap increases are acceptable substitutes for owner verification
  - this packet worker should implement script/test/catalog changes
- Explicit non-goals carried forward:
  - no broad docs freshness sweep
  - no stale packet refresh
  - no runtime/provider/review-wrapper/control-host edits
  - no Linear mutation, push, PR, or merge

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `rolling_freshness_cohorts.owner_issue` | Configured in `docs/docs-catalog.json` as the global rolling freshness owner. | CO-382 says docs freshness ownership is a governed high-churn surface requiring fallback expiry decisions. | Owner evidence is live same-project non-terminal before owned rolling debt is usable. | Changing policy caps or class eligibility. |
| `pass_with_owned_rolling_debt` | A valid outcome only for eligible historical rolling debt with a clean current diff and owner evidence. | Temporary fallback debt must have owner, trigger, review, maximum lifetime, removal condition, and validation. | Outcome remains temporary and expires through window/cap mechanics plus owner verification. | Treating it as permanent freshness forgiveness. |
| Invalid configured owner | Terminal owner checks already fail closed; CO-397 extends the issue contract to canceled, duplicate, out-of-project, and unverifiable owners. | Invalid owner metadata is historical evidence only. | Invalid configured owners block owned-debt pass decisions and drive canonical owner reuse/create plus catalog re-home guidance. | Renaming `docs:freshness:maintain` or silently creating unrelated owner keys. |
| Packet mirrors | CO-397 packet files are absent before this worker lane. | CO-382 follow-ups need docs-first packets before implementation. | Packet and mirrors exist under the required prefix and are registry-backed. | Implementation files. |

## Readiness Gate
- Not done if:
  - protected terms are missing or renamed
  - CO-397 can leave Backlog without packet and registry mirrors
  - the plan treats terminal, canceled, duplicate, out-of-project, or unverifiable owners as usable
  - the plan allows owned rolling debt to pass without a same-project live owner
  - the worker lane edits implementation files
- Pre-implementation issue-quality review evidence:
  - 2026-04-27: micro-task path is unavailable because correctness depends on exact protected wording, owner-source parity, and fallback-expiry classification.
  - 2026-04-27: parent implementation must not start until this packet and registry mirrors exist.
- Safeguard ownership split:
  - this worker owns packet and registry mirrors only
  - parent owns live Linear reconciliation, docs-review, implementation, validation, Linear workpad, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  - Create the CO-397 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
  - Add the canonical `tasks/index.json` item for `20260427-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba`.
  - Add one `docs/TASKS.md` snapshot for CO-397.
  - Add docs freshness registry rows for the six CO-397 packet/checklist surfaces.
  - Preserve exact protected terms and reject adjacent wrong interpretations.
  - Record CO-382 fallback decisions for owned rolling debt, invalid configured-owner fallback, and canonical owner recovery.
- Parent-owned functional requirements:
  - Verify `rolling_freshness_cohorts.owner_issue` through live issue context before treating owned debt as usable.
  - Require a live same-project non-terminal owner; terminal, canceled, duplicate, out-of-project, or unverifiable owners fail closed.
  - Reuse or create the canonical `docs:freshness:maintain` owner and re-home `docs/docs-catalog.json` guidance intentionally when configured owner verification fails.
  - Keep exact canonical owner overrides narrower than global owner issue evidence.
- Non-functional requirements:
  - Keep freshness gates fail-closed.
  - Preserve report evidence for raw stale rows, rolling rows, owner verification, and recommended action.
  - Avoid increasing rolling window or budget caps to hide owner problems.
- Interfaces / contracts:
  - `tasks/index.json` remains valid JSON.
  - `docs/docs-freshness-registry.json` remains valid JSON.
  - `docs/TASKS.md` keeps one current CO-397 snapshot.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs freshness ownership` | `pass_with_owned_rolling_debt` for eligible historical rolling cohorts | expire fallback | live same-project owner from `rolling_freshness_cohorts.owner_issue` or exact canonical owner mapping | Eligible declared baseline rows are inside `window_days`, within `max_entries` / `max_cohorts`, and current diff has no blocking freshness paths. | oldest known 2026-04-14; current review 2026-04-27 | driven by `expires_after` / next maintenance owner review | 7 days after normal cadence expiry under current policy | refresh, archive, reclassify, or create a refreshed same-project owner before the rolling window expires. | `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, and focused maintain tests. |
| `docs freshness ownership` | configured `rolling_freshness_cohorts.owner_issue` accepted without live same-project non-terminal verification | remove fallback | `CO-397` | Policy has an owner string but live verification is missing, terminal, canceled, duplicate, out-of-project, or unverifiable. | oldest known 2026-04-22 owner-reset behavior; current review 2026-04-27 | N/A after removal | N/A after removal | owned rolling debt is usable only after live same-project non-terminal verification or intentional canonical owner re-home. | Focused tests for `configured_owner_terminal`, canceled, duplicate, out-of-project, unverifiable, and live same-project owner cases. |
| `docs freshness ownership` | canonical `docs:freshness:maintain` owner reuse/create and `docs/docs-catalog.json` owner guidance re-home | justify retaining fallback | `docs:freshness:maintain` / CO-397 parent lane | Configured owner is terminal, canceled, duplicate, out-of-project, or unverifiable while stale eligible debt still needs a maintenance owner. | oldest known 2026-04-22 owner reset; current review 2026-04-27 | 2026-05-26 | Non-expiring durable ownership recovery contract | Remove only if a replacement owner-resolution contract preserves same-project live-owner verification, duplicate prevention, and intentional catalog guidance. | Maintain tests, docs cohort guide updates, catalog JSON parse, and `docs:freshness:maintain` evidence. |

- For `justify retaining fallback`, contract name: canonical `docs:freshness:maintain` owner recovery.
- Owning surface: `docs freshness ownership`.
- Steady-state proof expectation: parent implementation proves the canonical owner key stays stable, duplicate prevention remains keyed to the canonical owner, invalid configured owners fail closed, and `docs/docs-catalog.json` owner guidance changes only after explicit review.
- Large-refactor check: a large refactor is not required for the packet or the intended narrow implementation because CO-397 removes an unsafe owner fallback and reuses existing ownership surfaces. Parent must escalate if implementation adds another cached owner-status source or splits owner authority across unrelated lifecycle phases.

## Architecture & Data
- Architecture / design adjustments:
  - none in this worker lane
  - parent-owned implementation should centralize configured-owner verification for `docs:freshness:maintain`
- Data model changes / migrations:
  - none in this worker lane
  - parent may update report fields or reason codes only with focused tests and docs
- External dependencies / integrations:
  - Linear issue context for same-project owner verification
  - `docs/docs-catalog.json` rolling freshness policy
  - docs freshness and spec guard validation

## Validation Plan
- Worker packet checks:
  - parse `tasks/index.json`
  - parse `docs/docs-freshness-registry.json`
  - protected-term scan over packet files and `docs/TASKS.md`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - scoped diff/status check
- Parent implementation checks:
  - docs-review before implementation
  - focused `tests/docs-freshness-maintain.spec.ts` coverage for terminal, canceled, duplicate, out-of-project, unverifiable, and same-project live owner cases
  - focused `tests/docs-freshness.spec.ts` and `tests/spec-guard.spec.ts` if report owner metadata changes
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - normal parent validation floor and review loop
- Rollout verification:
  - parent records owner verification evidence and catalog owner re-home evidence
  - parent proves owned rolling debt cannot pass with invalid configured owner evidence

## Open Questions
- Whether the parent should add new explicit reason codes for out-of-project and unverifiable configured owners, or keep those grouped under the existing fail-closed owner verification contract while preserving `configured_owner_terminal` for terminal owners.

## Approvals
- Reviewer: parent CO-397 lane issue-quality review, pending
- Date: 2026-04-27
