---
id: 20260520-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c
title: CO-556 auto-restart or fail closed on stale resident code
relates_to: docs/PRD-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md
risk: high
owners:
  - Codex
last_review: 2026-05-20
related_action_plan: docs/ACTION_PLAN-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md
task_checklists:
  - tasks/tasks-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md
---

# TECH_SPEC Mirror - CO-556 auto-restart or fail closed on stale resident code

Canonical spec: `tasks/specs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`; PRD: `docs/PRD-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`; action plan: `docs/ACTION_PLAN-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.

## Contract
CO-556 is the stale resident code policy layer after CO-515. Parent implementation must consume trustworthy `supervised control-host source freshness` from `control-host-owner.json`, `source_root_freshness`, and `co-status --format json`; when the supervised source root is behind `origin/main`, the resident control-host must either auto-restart through a bounded and verified path or fail closed before active WIP continues as fresh. `provider-intake-state.json` remains audit evidence, and terminal Linear truth plus CO-555 terminal-claim precedence remain higher-precedence than retry/resumable active-WIP metadata.

## Not Done If
- Stale resident code can continue admitting, retrying, resuming, or reporting active WIP as fresh.
- Stale `source_root_freshness` only produces an advisory warning without auto-restart or fail closed behavior.
- Auto-restart claims success without proving the restarted supervised source root is current against `origin/main`.
- Fail closed depends on manually deleting or rewriting `provider-intake-state.json`.
- Terminal Linear truth is weakened and terminal retry/resumable claims become active WIP again.
- Parent duplicates CO-515 stale-source recompute/invalidation, reopens CO-458, or broadens into all CO-552 drift invariants.

## Validation
Parent owns focused stale resident code policy coverage, including auto-restart success, auto-restart unavailable, auto-restart unproven, and fail closed cases. Parent must also assert `co-status --format json` and `/ui/data.json` expose policy state with source evidence, preserve `provider-intake-state.json`, and keep CO-555 terminal Linear truth precedence. This child lane validates only JSON parsing, protected-term coverage, and diff hygiene for the declared docs files.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale resident code policy | Stale `source_root_freshness` can coexist with active WIP that still looks actionable. | remove fallback | CO-556 | `control-host-owner.json` or `co-status --format json` reports the supervised source root behind `origin/main`. | Observed 2026-05-20 | 2026-05-20 | This issue | Stale resident code triggers bounded auto-restart when safe or fail closed before work continues as fresh. | Focused control-host policy tests, status projection assertions, and CO-555 terminal-precedence regression coverage. |

- For `justify retaining fallback`: Not applicable. CO-556 does not approve retaining fail-open stale resident code behavior.
- Large-refactor check: keep CO-556 bounded to policy response unless source inspection shows split restart/fail-closed authority that must be consolidated.
- Minor-seam decision: acceptable because the policy consumes existing freshness evidence, preserves terminal Linear truth, and fails closed when restart cannot be proven.
