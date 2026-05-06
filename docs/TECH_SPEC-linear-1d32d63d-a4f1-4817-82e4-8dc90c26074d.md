---
id: 20260506-linear-1d32d63d-a4f1-4817-82e4-8dc90c26074d
title: CO-503 May 6 active spec-guard stale review baseline
relates_to: docs/PRD-linear-1d32d63d-a4f1-4817-82e4-8dc90c26074d.md
risk: medium
owners:
  - Codex
last_review: 2026-05-06
---

## Summary
- Objective: clear the May 6 `spec-guard` active-spec stale baseline with truthful spec review evidence.
- Scope: CO-503 packet files, the exact seven stale specs, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Constraints: preserve strict `spec-guard`, keep `CO-455` implementation out of scope, and avoid blind date updates.

## Issue-Shaping Contract
- User-request translation carried forward: `CO-503` owns the clean-main stale active-spec baseline that blocks PR `#779` / `CO-455`; it must classify and repair the exact `last_review=2026-04-05` set rather than widening the feature lane.
- Protected terms / exact artifact and surface names: `spec-guard`, `active specs`, `last_review=2026-04-05`, `Core Lane`, PR `#779`, `CO-455`, stale active specs, `spec-guard:active-specs:last_review=2026-04-05`.
- Nearby wrong interpretations to reject:
  - `CO-455` caused the stale baseline
  - `spec-guard` should be weakened or skipped
  - terminal owners `CO-278`, `CO-428`, or `CO-498` are active capacity
  - stale docs can be hidden under rolling docs:freshness cohorts
  - historical packet files can be deleted to clear the gate
- Explicit non-goals carried forward:
  - no `CO-455` code or test changes
  - no guard behavior changes
  - no unrelated docs freshness cohorts
  - no terminal owner reopening

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| `spec-guard` on current main | Fails on seven stale active specs at 31 days. | `spec-guard` should fail closed for stale active specs. | Baseline is repaired through reviewed metadata only. | Any `spec-guard` policy change. |
| Source issue state | Six Linear-backed source specs still appear active in repo metadata. | Live Linear state is authority for terminal reclassification. | `CO-80`, `CO-82`, `CO-83`, `CO-84`, `CO-85`, and `CO-98` specs become inactive `done`. | Deleting historical packet docs. |
| RLM orchestrator spec | `0105-rlm-orchestrator.md` remains an active in-progress plan. | Active specs need a current review note. | The spec stays active with a May 6 review note. | Reclassifying RLM without terminal evidence. |
| `CO-455` feature lane | PR `#779` sees the blocker after branch refresh. | Clean `origin/main` reproduces the same set. | PR `#779` can cite CO-503 for the unrelated baseline repair. | Any CO-455 implementation change. |

## Readiness Gate
- Not done if:
  - `node scripts/spec-guard.mjs --dry-run` still reports the May 6 stale set
  - touched specs lack review notes or live issue evidence
  - docs freshness still reports the matching terminal packet rows as active stale docs
  - `CO-455` code or tests change
  - terminal owners are used as active capacity
- Pre-implementation issue-quality review evidence:
  - 2026-05-06: issue is not narrower than the user request because it names the exact stale set, trigger, canonical owner key, non-goals, and false-done conditions. Micro-task path is inappropriate because correctness depends on exact protected wording, source-state classification, and registry/index traceability.
- Safeguard ownership split:
  - parent owns live Linear verification, metadata edits, validation, workpad, PR, and handoff
  - child lane `stale-spec-review-secondary` was launched for three spec files, completed, and rejected because it lacked live Linear state and refreshed terminal specs as active

## Technical Requirements
1. Reproduce the pre-fix stale active-spec set with `node scripts/spec-guard.mjs --dry-run`.
2. Create and register the CO-503 packet and mirrors.
3. Live-verify the six Linear source issues before terminal reclassification.
4. Mark terminal source specs as inactive `done` with May 6 review notes and preserve historical packet files.
5. Refresh `tasks/specs/0105-rlm-orchestrator.md` as active only after a current review note.
6. Update `tasks/index.json` with canonical owner evidence for source classifications.
7. Update `docs/docs-freshness-registry.json` so completed-lane packet/mirror rows are archived with 365-day cadence.
8. Keep `spec-guard` strict and unchanged.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes, this lane touches stale metadata.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `spec-guard` stale metadata | Completed-lane specs left active after source issue closeout | expire fallback | CO-503 | `last_review=2026-04-05` active specs reached 31 days | 2026-05-06 | 2026-05-06 | 2026-05-13 | Source specs reclassified inactive or refreshed with evidence | `node scripts/spec-guard.mjs --dry-run`, `npm run docs:freshness` |

- Large-refactor check: not applicable. The repair is a bounded metadata classification, and no code authority split is introduced.

## Architecture & Data
- Architecture / design adjustments: none.
- Data model changes / migrations: none.
- External dependencies / integrations: live Linear `issue-context` reads for the six source issues and the current CO-503 workpad/parallelization helpers.

## Validation Plan
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:freshness`
- `jq empty tasks/index.json docs/docs-freshness-registry.json`
- `node scripts/delegation-guard.mjs`
- required repo validation floor
- manifest-backed standalone review under `FORCE_CODEX_REVIEW=1`
- explicit elegance/minimality pass
- PR attach plus `pr ready-review` drain before review handoff

## Approvals
- Pre-implementation issue-quality review: self-approved by Codex provider worker on 2026-05-06 from the issue contract and live baseline reproduction.
- Parallelization decision: `parallelize_now` / `independent_scope_available`; child lane completed and was rejected because parent live evidence superseded its active-refresh classification.
- Date: 2026-05-06

