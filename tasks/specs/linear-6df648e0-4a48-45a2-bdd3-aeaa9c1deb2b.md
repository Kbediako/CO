---
id: 20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b
title: "CO-444 re-home docs:freshness:maintain owner after terminal CO-441"
status: in_progress
owner: Codex
created: 2026-04-30
last_review: 2026-05-24
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md
related_action_plan: docs/ACTION_PLAN-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md
related_tasks:
  - tasks/tasks-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md
review_notes:
  - "2026-05-24: CO-579 pre-expiry review: retained active or blocked scope; no spec contract changes required."
  - "2026-04-30: Bounded child lane created the packet and registry mirrors."
  - "2026-04-30: Parent reproduced the terminal CO-441 owner blocker and re-homed live metadata to CO-444."
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-444 re-home docs:freshness:maintain owner after terminal CO-441

## Canonical Reference
- PRD: `docs/PRD-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- Task checklist: `tasks/tasks-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- Agent mirror: `.agent/task/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`

## Summary
- Objective: make `CO-444` the live same-project owner for retained `docs:freshness:maintain` rolling debt after terminal configured owner `CO-441`.
- Scope:
  - CO-444 docs-first packet and task mirrors
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Constraints:
  - preserve `docs:freshness:maintain`
  - preserve `canonical_owner_key=docs:freshness:maintain`
  - preserve `co-420-apr-28-march-28-task-packet-mirror`
  - preserve `terminal configured owner CO-441`
  - preserve `block_unowned_repo_debt`
  - preserve `March 28 task-packet mirror rolling cohort`
  - avoid source, package, validation-script, policy, and CO-443 behavior changes

## Issue-Shaping Contract
- User-request translation:
  - The terminal configured owner `CO-441` is historical owner evidence and cannot remain the live owner.
  - CO-444 is the next tactical owner handoff for `docs:freshness:maintain`.
  - `block_unowned_repo_debt` remains owner-truth evidence, not a waiver.
  - The retained `co-420-apr-28-march-28-task-packet-mirror` March 28 task-packet mirror rolling cohort must stay visible.
  - The repair moves only live owner metadata and guide lineage.
- Protected terms / exact artifact and surface names:
  - `docs:freshness:maintain`
  - `canonical_owner_key=docs:freshness:maintain`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `terminal configured owner CO-441`
  - `block_unowned_repo_debt`
  - `March 28 task-packet mirror rolling cohort`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Nearby wrong interpretations to reject:
  - Stop at packet-only registration while `CO-441` remains configured as live owner.
  - Treat terminal configured owner `CO-441` as harmless because current changed paths do not own the debt.
  - Delete, hide, archive, refresh, or reclassify historical rolling cohort evidence to clear validation.
  - Weaken `block_unowned_repo_debt` into a warning.
  - Widen CO-443 or another product implementation lane into recurring docs-freshness maintenance.
- Explicit non-goals:
  - no freshness policy weakening
  - no historical evidence deletion
  - no stale-row blind refresh, hiding, archiving, or reclassification
  - no source code, package, or validation-script changes
  - no CO-443 provider-intake behavior changes

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-444 docs packet | No packet or registry rows existed for the CO-444 issue before this lane. | Recent `docs:freshness:maintain` owner re-home lanes carry packet docs, mirrors, task index, task snapshot, and registry rows. | CO-444 packet and mirrors exist with canonical owner marker and protected terms. | Source, package, validation-script, or policy changes. |
| `docs:freshness:maintain` owner truth | Pre-fix maintenance reproduced `block_unowned_repo_debt` with terminal `CO-441`. | Terminal configured owners are evidence only and must route to a live same-project owner without weakening the gate. | Owner metadata points to live `CO-444`; `CO-441` is retained as terminal historical evidence. | Maintenance classifier behavior changes or policy weakening. |
| March 28 rolling cohort | `co-420-apr-28-march-28-task-packet-mirror` remains retained rolling debt with 33 rows. | Retained cohort rows stay visible and machine-readable while owner metadata moves forward. | The cohort remains visible under `CO-444`; no row deletion, hidden ownership, refresh, archive, or reclassification. | Row deletion, hiding, archiving, reclassification, or `last_review` refresh. |
| Owner files | `docs/docs-catalog.json` and `docs/guides/docs-freshness-cohorts.md` carry live owner truth and cohort lineage. | Live owner repair should only move owner metadata and guide lineage. | Catalog owner is `CO-444`; guide lineage records `CO-441` terminal history and `CO-444` current ownership. | Broad registry rewrite or CO-443 behavior changes. |

## Readiness Gate
- Not done if:
  - packet or mirrors omit protected terms
  - the live owner path still resolves only to terminal `CO-441`
  - `docs:freshness:maintain` still reports `block_unowned_repo_debt` for `canonical_owner_key=docs:freshness:maintain`
  - stale registry rows or historical cohort evidence are deleted, hidden, archived, blindly refreshed, or reclassified
  - `docs:freshness` or `docs:freshness:maintain` behavior is weakened
  - CO-443 or another implementation lane is widened into recurring docs-freshness maintenance
- Pre-implementation issue-quality review evidence:
  - 2026-04-30: child lane established the docs-first packet and registry mirrors.
  - 2026-04-30: parent kept live owner repair narrow to catalog metadata and cohort guide lineage.
- Safeguard ownership split:
  - child owned packet and registry mirrors only
  - parent owns live owner metadata repair, validation, PR lifecycle, Linear state, and workpad

## Technical Requirements
- Functional requirements:
  1. Create six CO-444 packet/mirror docs.
  2. Register the task in `tasks/index.json`.
  3. Add a `docs/TASKS.md` snapshot.
  4. Add six active registry rows to `docs/docs-freshness-registry.json`.
  5. Re-home `docs/docs-catalog.json` rolling owner metadata to `CO-444`.
  6. Update `docs/guides/docs-freshness-cohorts.md` to preserve terminal `CO-441` lineage and current `CO-444` ownership.
  7. Preserve the retained March 28 rolling cohort without row deletion, hidden ownership, refresh, archive, reclassification, or policy weakening.
- Non-functional requirements:
  - docs/config-only diff
  - JSON remains parseable
  - no source, script, package, policy, or CO-443 behavior changes
  - owner repair remains reviewable and machine-verifiable
- Interfaces / contracts:
  - task id: `linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
  - registry id: `20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
  - helper canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - protected owner-key token: `canonical_owner_key=docs:freshness:maintain`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Completed-lane historical packet/spec freshness hold | `expire fallback` | CO-444 | Terminal configured owner and completed-lane cohort evidence | 2026-05-05 | 2026-05-05 | 2026-05-12 | Archive packet mirrors and reclassify specs under a live owner; otherwise block handoff | `docs:freshness:maintain -- --format json` |

- Large refactor decision: bounded metadata cleanup under the existing `docs:freshness:maintain` owner; no runtime or policy authority split is added.
- Minor seam decision: bounded temporary freshness-hold cleanup is acceptable; unresolved rows must be archived, reclassified, or blocked by 2026-05-12.

## Acceptance Criteria
- CO-444 packet docs are created in the declared file scope.
- `tasks/index.json` registers the canonical task id.
- `docs/TASKS.md` includes the CO-444 owner re-home snapshot.
- `docs/docs-freshness-registry.json` includes six active rows with `last_review=2026-04-30`.
- `docs/docs-catalog.json` sets the rolling freshness owner issue to `CO-444`.
- `docs/guides/docs-freshness-cohorts.md` records terminal `CO-441` and current live `CO-444`.
- `docs:freshness:maintain` reports `pass_with_owned_rolling_debt` with `owner_issue=CO-444`.

## Validation Plan
- JSON parse for `tasks/index.json`.
- JSON parse for `docs/docs-freshness-registry.json`.
- `node scripts/delegation-guard.mjs`.
- `node scripts/spec-guard.mjs --dry-run`.
- `npm run build`.
- `npm run lint`.
- `npm run test`.
- `npm run docs:check`.
- `npm run docs:freshness`.
- `npm run docs:freshness:maintain -- --format json`.
- `npm run repo:stewardship`.
- `git diff --check`.
- `node scripts/diff-budget.mjs`.
- Manifest-backed standalone review under `FORCE_CODEX_REVIEW=1`.
- Explicit elegance/minimality review.

## Open Questions
- None.

## Approvals
- Reviewer: CO-444 provider worker
- Date: 2026-04-30
