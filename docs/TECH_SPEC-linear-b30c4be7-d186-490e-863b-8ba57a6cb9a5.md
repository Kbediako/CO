---
id: 20260520-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5
title: "CO-566 Ready resumable recovery without broad dispatch source enablement"
relates_to: docs/PRD-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md
risk: high
owners:
  - Codex
last_review: 2026-05-20
related_action_plan: docs/ACTION_PLAN-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md
task_checklists:
  - tasks/tasks-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md
---

## Canonical Reference
- Linear issue: `CO-566` / `b30c4be7-d186-490e-863b-8ba57a6cb9a5`
- PRD: `docs/PRD-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- Canonical task spec: `tasks/specs/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- Task checklist: `tasks/tasks-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- `.agent` mirror: `.agent/task/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- Source anchor: `ctx:sha256:4b0810177126360ba862e82ae588b6fff3ddbb23e51d40f70b84d4bfc6ce9da2#chunk:c000001`
- Canonical owner key: `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`

## Summary
- Objective: define the docs-first implementation contract for recovering eligible Ready/Rework issues whose terminal failed historical provider runs should be preserved as audit evidence while stale `resumable` claims launch new governed work or produce actionable blocked classifications.
- Scope: docs packet and parent implementation guidance for provider-intake recovery behavior when dispatch source is disabled.
- Constraints: no source, tests, registry mirrors, Linear state, workpad, PR lifecycle, provider-intake artifact mutation, or CO-558 docs-freshness scope edit from this child lane.

## Issue-Shaping Contract
- User-request translation carried forward: CO-566 should recover Ready/Rework issues with terminal failed historical runs by treating the stale `resumable` claim as recoverable audit evidence, then launching new governed work or returning an actionable blocked classification through a targeted provider-intake recovery path, without broad `dispatch_pilot.enabled=true`, without manual provider-intake-state deletion, and without changing CO-558 docs-freshness scope.
- Protected terms / exact artifact and surface names: `Ready`, `Rework`, `terminal failed historical runs`, `resumable`, `recover`, `dispatch source disabled`, `dispatch_pilot.enabled=true`, `provider-intake-state.json`, `manual provider-intake-state deletion`, `CO-558 docs-freshness scope`, `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`, `codex-orchestrator:canonical-owner-key=provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`.
- Nearby wrong interpretations to reject: enabling `dispatch_pilot.enabled=true` globally, deleting provider-intake state, resuming terminal Done/canceled/duplicate issues, folding this into CO-558 docs-freshness work, or asking the docs child lane to edit source/tests/registry mirrors.
- Explicit non-goals carried forward: no global dispatch pilot rollout, no provider-intake-state deletion, no docs-freshness registry/catalog edit, no registry mirror edit from this child lane, no source/test implementation from this child lane, and no Linear/PR lifecycle mutation from this child lane.

## Parity / Alignment Matrix
- Current truth: Ready/Rework issues can have terminal failed historical runs while the dispatch source is disabled; existing operator recovery can appear to require broad dispatch pilot enablement or manual provider-intake-state cleanup.
- Reference truth: non-terminal issue state plus terminal historical failure evidence should allow targeted recovery, while terminal live issue states remain excluded and provider-intake history remains audit evidence.
- Target truth / intended delta: parent implements a narrow recovery path that launches eligible Ready/Rework issues into new governed work or returns an actionable blocked classification while preserving historical failed run evidence, with no broad `dispatch_pilot.enabled=true` and no manual provider-intake-state deletion.
- Explicitly out-of-scope differences: global dispatch policy, scheduler redesign, manual artifact cleanup, CO-558 docs-freshness scope, registry mirrors by this child lane, source/test edits by this child lane, and terminal issue recovery.

| Surface | Current truth | Reference truth | Target truth | Out of scope |
| --- | --- | --- | --- | --- |
| Ready/Rework issue recovery | Non-terminal issue can be Ready/Rework with terminal failed historical run evidence and a stale `resumable` provider-intake claim. | Live non-terminal issue truth should permit recoverability when the failed run is terminal audit evidence rather than active work. | Launch new governed work or return an actionable blocked classification through targeted recovery. | Recovering Done/canceled/duplicate/archived issues. |
| Dispatch source disabled | Broad `dispatch_pilot.enabled=true` can look like the workaround. | Global dispatch pilot config should not be the recovery mechanism. | Avoid broad `dispatch_pilot.enabled=true`. | Pilot rollout or scheduler policy change. |
| Provider-intake state | `provider-intake-state.json` can look stale or blocking. | Raw provider-intake state is audit evidence. | Update current recovery status through governed workflow without manual deletion. | Hand deletion, quarantine, or artifact hiding. |
| CO-558 docs-freshness | CO-558 owns a separate docs-freshness scope. | Docs-freshness ownership remains separate. | CO-566 stays provider-intake recovery scoped. | CO-558 scope, catalog, or registry edits. |

## Readiness Gate
- Not done if:
  - the canonical owner key or marker is missing
  - `Ready/Rework`, `terminal failed historical runs`, or `resumable` is not preserved
  - the recovery path depends on broad `dispatch_pilot.enabled=true`
  - the recovery path depends on manual provider-intake-state deletion
  - terminal Done/canceled/duplicate/archived issues can be relaunched or marked current work because of stale `resumable` evidence
  - CO-558 docs-freshness scope changes
  - this child lane edits anything outside the six declared packet/checklist files
- Pre-implementation issue-quality review evidence:
  - 2026-05-20: issue is not narrower than the user request because the packet names the exact Ready/Rework recovery state, terminal failed historical run evidence, dispatch source disabled guardrail, provider-intake-state deletion rejection, CO-558 non-goal, canonical owner key, Not Done If, and parity matrix.
  - Micro-task path is inappropriate because correctness depends on exact protected wording, fallback/seam classification, and parent-owned implementation boundaries.
- Safeguard ownership split:
  - docs child lane owns only this six-file packet
  - parent owns source investigation, tests, implementation, registry mirrors, Linear state, workpad, PR lifecycle, validation, and final issue transition

## Technical Requirements
- Functional requirements:
  1. Identify only non-terminal Ready/Rework issues as candidates.
  2. Confirm the historical provider run is terminal failed evidence and not active worker proof before launching new governed work.
  3. Keep terminal live issue states excluded from recovery.
  4. Avoid requiring broad `dispatch_pilot.enabled=true`.
  5. Avoid manual `provider-intake-state.json` deletion, hand-editing, quarantine, or artifact hiding.
  6. Preserve provider-intake audit evidence while updating current recovery status through governed workflow behavior.
  7. Keep CO-558 docs-freshness scope unchanged.
  8. Produce focused parent-owned tests for the recovery seam and status projection.
- Non-functional requirements:
  - fail closed when live issue state is terminal or unknown
  - keep recovery evidence explainable in provider-intake/status surfaces
  - keep the fix narrowly scoped and reversible
- Interfaces / contracts:
  - parent implementation should use canonical owner key `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1` for traceability
  - parent registry integration, if accepted, is outside this child lane

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-intake Ready/Rework recovery | Recovery appears to require broad `dispatch_pilot.enabled=true` or manual `provider-intake-state.json` deletion when dispatch source is disabled and the historical run is terminal failed. | `remove fallback` | CO-566 | Non-terminal Ready/Rework issue has a terminal failed historical run and stale `resumable` claim. | 2026-05-20 | 2026-05-20 | This issue | Targeted recovery launches new governed work or returns an actionable blocked classification without global dispatch enablement or manual state deletion. | Parent-owned focused provider-intake/recover/status projection tests. |

- Large-refactor check: a bounded provider-intake recovery fix is acceptable because this issue targets one recovery seam. A broader dispatch architecture refactor, provider-intake state rewrite, or docs-freshness ownership redesign is out of scope.

## Architecture & Data
- Architecture / design adjustments:
  - parent should decide the exact implementation seam after source inspection
  - likely candidates are provider-intake recovery, provider issue handoff, recover endpoint behavior, selected-run projection, or the status projection joining them
  - recovery must use live issue state and historical run evidence rather than manual state cleanup
- Data model changes / migrations:
  - no data migration from this child lane
  - parent should avoid destructive state rewrites and preserve historical provider-intake evidence
- External dependencies / integrations:
  - Linear issue state truth
  - provider-intake state and run history
  - parent-owned registry/task mirrors

## Validation Plan
- Child-lane checks:
  - protected-term scan across the six packet files
  - scoped markdown whitespace check
  - changed-file review confirming only declared file paths changed
- Parent-owned checks:
  - focused regression for Ready/Rework + terminal failed historical run with a stale `resumable` claim launching new governed work through explicit recovery
  - regression proving terminal Done/canceled/duplicate issue truth remains excluded
  - regression proving broad `dispatch_pilot.enabled=true` is not required
  - regression or fixture proving `provider-intake-state.json` is not manually deleted or hidden
  - status/co-status projection proof that current recovery state is truthful while audit history remains visible

## Open Questions
- Parent must choose the exact source seam after reading the current provider-intake/recover implementation.
- Parent must decide whether one focused test file is enough or whether status projection needs separate coverage.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-20
