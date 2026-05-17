---
id: 20260517-linear-8826c2fa-3160-4fa3-bfcb-eaa0c0b9d6f1
title: CO-553 eliminate docs freshness policy capacity over-budget debt
relates_to: docs/PRD-linear-8826c2fa-3160-4fa3-bfcb-eaa0c0b9d6f1.md
risk: high
owners:
  - Codex
last_review: 2026-05-17
---

## Summary
- Objective: eliminate the live `docs:freshness:maintain` `block_policy_over_budget` blocker without weakening strict gates.
- Scope: classify terminal or historical packet/mirror/report rows out of live rolling capacity, preserve active direct-action freshness debt, and expose capacity anatomy in repo-gate/status output.
- Constraints: no cap increase, no deletion of historical docs, no blind `last_review` bump for historical rows, no CO-522 terminal transition.

## Issue-Shaping Contract
- User-request translation carried forward: clear the owner-routed policy-capacity debt while retaining `CO-522` as the current non-terminal canonical owner anchor.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `block_policy_over_budget`, `policy_capacity_status`, `CO-522`, `CO-552`, `current_entries=470`, `max_entries=300`, `current_cohorts=37`, `max_cohorts=2`.
- Nearby wrong interpretations to reject: treating `blocking_changed_paths=0` as a waiver, raising capacity limits, deleting history, blindly bumping dates, or closing CO-522 under the old owner model.
- Explicit non-goals carried forward: no broad canonical-owner architecture split, no unrelated Linear issue state changes, no CO-522 PR rework.

## Parity / Alignment Matrix
- Current truth: `docs:freshness:maintain` blocks with `policy_capacity_status.status=over_budget`, `current_entries=470`, `current_cohorts=37`, `expired_entries=0`, and owner `CO-522`.
- Reference truth: active public/current docs and active remediation rows must fail closed; terminal or preserved historical task packets must not consume live rolling capacity once correctly classified.
- Target truth / intended delta: historical terminal packet/mirror/report rows are archived or otherwise excluded from live capacity, active strict docs remain reviewed or actionable, and status output reports exact capacity counts and excesses.
- Explicitly out-of-scope differences: policy caps stay unchanged, CO-522 remains non-terminal, and long-term canonical-owner identity split remains outside this lane.

## Readiness Gate
- Not done if: capacity still reports the same unexplained `block_policy_over_budget`, status anatomy remains opaque, or strict gates are weakened.
- Pre-implementation issue-quality review evidence: live issue context showed CO-553 in `Ready`, no attached PR, and no existing workpad; the lane was moved to `In Progress` before coding.
- Safeguard ownership split: parent owns docs packet, registry classification, maintain/status implementation, validation, review, PR, and workpad; same-issue child lane `capacity-tests` owns `tests/docs-freshness-maintain.spec.ts`.

## Technical Requirements
- Functional requirements: filter live policy capacity to active owner-actionable entries; make `docs:freshness` carry explicit non-terminal task lifecycle rows into stale/rolling report inputs even when registry metadata says archived; classify historical packet/mirror/report rows out of capacity using registry metadata; keep terminal lifecycle rows fail-closed through terminal lifecycle handling; expose owner, handoff blocking, entry/cohort counts, excess counts, expired counts, terminal lifecycle paths, and blocking changed paths through repo-gate/status data.
- Non-functional requirements: deterministic JSON output, fail-closed behavior for invalid policy/owner evidence, and reviewable metadata-only classification for historical rows.
- Interfaces / contracts: `scripts/docs-freshness-maintain.mjs`, `docs/docs-freshness-registry.json`, `packages/orchestrator-status-ui/app.js`, and focused tests.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes. The lane touches stale historical packet capacity classification.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical packet rows counted as live rolling capacity | remove fallback | CO-553 | `block_policy_over_budget` with owner-routed historical rows | 2026-05-17 | 2026-05-17 | 0 days | Historical terminal/preserved rows no longer count as live active capacity and active rows remain fail-closed | focused maintain tests plus `docs-freshness-maintain --check` |
| `co-status` repo gate | Capacity status hides entry/cohort excess detail | remove fallback | CO-553 | operator cannot distinguish owner/action/capacity anatomy | 2026-05-17 | 2026-05-17 | 0 days | Repo-gate/status output names counts, excesses, expired rows, handoff blocking, and sample path categories | status projection/UI tests plus current proof |

- Large-refactor check: the long-term canonical owner identity split remains a separate architectural lane; CO-553 is the narrow live debt cleanup and status anatomy fix needed before handoff can proceed.

## Architecture & Data
- Architecture / design adjustments: live capacity counts are based on active owner-actionable historical entries, not terminal or archived/preserved historical rows; explicit non-terminal task lifecycle metadata overrides archived registry metadata and remains live.
- Data model changes / migrations: registry rows for historical packet/mirror/report debt may gain `status=archived`, `lifecycle_state=archived`, `archived_at`, `archive_reason`, and terminal `task_status`; non-terminal task packets remain `active` and may receive a reviewed `last_review` update only after content review.
- External dependencies / integrations: Linear owner verification remains through existing `docs:freshness:maintain` owner action evidence.

## Validation Plan
- Tests / checks: focused freshness/maintain tests including upstream non-terminal task lifecycle report coverage, status projection/UI test, `node scripts/docs-freshness-maintain.mjs --check --format json`, `npm run docs:freshness`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and current `co-status` proof.
- Rollout verification: workpad records before/after capacity counts and the proof path.
- Monitoring / alerts: strict docs freshness gates remain unchanged and continue to fail closed for active or invalid debt.

## Open Questions
- None for this lane; the canonical owner identity split remains outside scope.

## Approvals
- Reviewer: CO provider worker
- Date: 2026-05-17
