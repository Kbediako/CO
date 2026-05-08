---
id: 20260407-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844
title: CO STATUS: make Next refresh truthful under Linear cooldown and shared-budget poll suppression
relates_to: docs/PRD-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md
risk: high
owners:
  - Codex
last_review: 2026-05-08
---

## Canonical Reference
- Canonical TECH_SPEC: `docs/TECH_SPEC-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- Task spec: `tasks/specs/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- PRD: `docs/PRD-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`
- Task checklist: `tasks/tasks-linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844.md`

## Traceability
- Linear issue: `CO-108` / `e09ce1db-e2f8-4fe7-9509-9f61a02f4844`
- Linear URL: https://linear.app/asabeko/issue/CO-108/co-status-make-next-refresh-truthful-under-linear-cooldown-and-shared
- Current workspace branch: `linear/co-108-next-refresh-truthful-cooldown`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make `CO STATUS` render `Next refresh` from authoritative shared-budget plus polling projection truth instead of raw `checking` or stale `next_poll_in_ms` heuristics.
- Scope:
  - project an authoritative next-refresh mode and countdown from `providerPollingHealth.ts`
  - preserve that projected truth through `controlRuntime.ts` persisted snapshot normalization
  - use the projected fields in `compatibilityIssuePresenter.ts` and `controlStatusDashboard.ts`
  - add focused coverage for cooldown countdown, cooldown-to-checking transition, requests and complexity exhaustion, and restart or rehydrate truth
- Constraints:
  - keep the lane scoped to polling truth and summary-line correctness
  - do not reopen broader `CO STATUS`, rate-limit-policy, or recovery lanes
  - prefer additive payload fields over mutating unrelated scheduling behavior

## Technical Requirements
- Functional requirements:
  - under active shared-budget cooldown, the authoritative next eligible refresh time comes from cooldown or reset state, not stale scheduled-poll values
  - `Next refresh` must not show `checking now...` while cooldown suppression is still active
  - `checking now...` must still appear for real in-flight poll attempts after cooldown clears
  - ordinary scheduled polling must still render a countdown when no cooldown or in-flight attempt is active
  - requests-exhausted and complexity-exhausted paths must both reuse the projected next-refresh truth
  - persisted polling snapshots must preserve truthful next-refresh output after restart or rehydrate
- Non-functional requirements:
  - keep the projection deterministic and renderer-light
  - preserve backward-compatible polling semantics outside the new projected fields
  - avoid broad changes to rate-limit collection or refresh orchestration
- Interfaces / contracts:
  - shared budget: `orchestrator/src/cli/control/linearBudgetState.ts`
  - polling projection: `orchestrator/src/cli/control/providerPollingHealth.ts`
  - lifecycle scheduling: `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - persisted snapshot normalization: `orchestrator/src/cli/control/controlRuntime.ts`
  - operator event text and dashboard renderer: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/controlStatusDashboard.ts`

## Architecture & Data
- Architecture / design adjustments:
  - extend `ControlPollingHealthPayload` with projected next-refresh metadata, expected as:
    - `next_refresh_state`: one of `cooldown`, `checking`, `scheduled`, or `unknown`
    - `next_refresh_at`: authoritative next eligible refresh timestamp when one exists
    - `next_refresh_in_ms`: authoritative countdown in milliseconds when one exists
  - compute those fields in `providerPollingHealth.ts` with precedence:
    1. active shared-budget cooldown
    2. real in-flight polling attempt
    3. ordinary scheduled next poll
    4. unknown
  - normalize the new fields from persisted polling snapshots in `controlRuntime.ts` so restart or rehydrate preserves truthful output even before the next live polling update
  - use the projected fields in `compatibilityIssuePresenter.ts` for exhaustion countdown text and in `controlStatusDashboard.ts` for summary and compact `Status` lines
- Data model changes / migrations:
  - no storage migration expected; the persisted polling record can carry additive keys
  - runtime normalization must backfill projected fields from older polling snapshots that predate the new keys
- External dependencies / integrations:
  - `resolveLinearPollingInterval(...)` still governs actual scheduling
  - `readSharedLinearBudgetStatus(...)` remains the source of shared-budget cooldown truth
  - no new external integrations are required

## Parity / Alignment Matrix
- Current truth:
  - shared-budget cooldown truth exists
  - polling payload exposes only raw scheduling or checking fields
  - renderer and budget event text can diverge from active cooldown truth
- Reference truth:
  - the shared-budget cooldown window is authoritative for the next eligible tracked-issue refresh
  - operator surfaces distinguish suppression, real checking, and ordinary scheduling
- Target truth / intended delta:
  - polling payload carries authoritative next-refresh projection
  - summary lines and budget exhaustion event text reuse that projection
  - persisted snapshots keep the same truth after restart
- Explicitly out-of-scope differences:
  - general event-parity rewrites
  - shared-budget identity or endpoint-budget hardening
  - unrelated STATUS layout work

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused regressions in `LinearBudgetState.test.ts`, `ControlServerPublicLifecycle.test.ts`, `ControlRuntime.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlStatusDashboard.test.ts`
  - full repo validation floor before review handoff
- Rollout verification:
  - prove that cooldown countdown, in-flight checking, and scheduled polling each render the correct operator text
  - prove that persisted polling snapshots reproduce cooldown truth without a fresh live poll
- Monitoring / alerts:
  - no new monitoring surface; rely on deterministic tests and reviewable payload assertions

## Open Questions
- Whether the projected timestamp should be used anywhere else besides budget event text and STATUS summary lines in this lane.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo `docs/TASKS.md` line-budget guard after `spec-guard` passed; manual fallback accepted
- Date: 2026-04-07
- Manifest: `/Users/kbediako/Code/CO/.workspaces/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/.runs/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844-co-108-docs-review/cli/2026-04-07T14-43-58-099Z-9d3f8f3c/manifest.json`
- Review telemetry: fallback note at `out/linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844/manual/20260407T144358Z-docs-review-fallback.md`
