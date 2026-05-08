---
id: 20260407-linear-f71992e3-ddda-4198-b43c-97ccb36908cf
title: CO STATUS: finish post-CO-97 rate-limit reset truth and Symphony-parity event/stage text
relates_to: docs/PRD-linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md
risk: high
owners:
  - Codex
last_review: 2026-05-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`
- PRD: `docs/PRD-linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`
- Task checklist: `tasks/tasks-linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`

## Traceability
- Linear issue: `CO-103` / `f71992e3-ddda-4198-b43c-97ccb36908cf`
- Linear URL: https://linear.app/asabeko/issue/CO-103/co-status-finish-post-co-97-rate-limit-reset-truth-and-symphony-parity
- Follow-up to: `CO-97` / `bd8f3cc3-0871-470b-8c86-2f3815b326f2`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: finish the remaining `CO STATUS` projection/rendering parity gap after `CO-97` by making rate-limit presentation, running `STAGE`, and running `EVENT` truthful and Symphony-aligned while preserving the already-correct upstream Codex and shared Linear budget substrate.
- Scope:
  - preserve active Linear state verbatim in `STAGE`
  - move richer operator-facing `EVENT` truth upstream out of dashboard-local fallback logic
  - render the steady-state compact `Codex ... || Linear ...` rate-limit row
  - remove the live `Dashboard:` line
  - render a separate `Status controls` section below `Backoff queue`
  - add focused regression coverage and payload/output proof
- Constraints:
  - keep shared Linear budget handling authoritative and unchanged unless a narrow truth bug proves otherwise
  - do not reopen `CO-98`, `CO-99`, `CO-100`, `CO-81`, `CO-101`, or `CO-17`
  - keep the work bounded to STATUS projection/rendering seams

## Technical Requirements
- Functional requirements:
  - combined `Rate Limits` renders as `Codex ... || Linear ...` in steady state
  - non-exhausted buckets show percent remaining; exhausted buckets show `resets Xm`
  - the rendered Linear row includes `requests` and `complexity`
  - running `STAGE` maps to the current Linear state, not runtime/provider phase
  - running `EVENT` surfaces richer truthful shared concepts (`session started`, `turn started`, `turn completed`, `token usage updated`, `rate limits updated`, approvals/input/tool/command progress when available) and truthful CO-specific budget/backoff/review-drain semantics
  - `CO STATUS` does not render the `Dashboard:` line on the live default surface
  - `Status controls` renders as its own section below `Backoff queue`
  - implementation notes explicitly record that the target budget/backoff strings did not ship on validated `main` before this lane unless that changes during implementation
- Non-functional requirements:
  - keep the output deterministic and operator-readable
  - compute authoritative operator-facing truth upstream first, leaving the dashboard mostly as a formatter
  - preserve explicit `n/a` / existing truthful fallbacks when stronger evidence is unavailable
- Interfaces / contracts:
  - projection/runtime: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/controlRuntime.ts`
  - renderer: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - preserved upstream budget sources: `orchestrator/src/cli/control/linearBudgetState.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`
  - regression coverage: `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - keep budget composition in `controlRuntime.ts`
  - make `selectedRunProjection.ts` stop collapsing active started states to generic `running`
  - promote operator-facing event text into projection/presenter output rather than leaving it to `summarizeRunningEvent(...)`
  - keep `controlStatusDashboard.ts` focused on formatting the upstream truth and on the bounded layout changes (`Rate Limits`, no `Dashboard:`, separate `Status controls`)
- Data model changes / migrations:
  - no storage or migration changes expected
  - a bounded read-model field addition for authoritative operator-facing running event text is acceptable if it materially reduces renderer inference
- External dependencies / integrations:
  - live tracking state from `linearDispatchSource.ts`
  - shared Linear polling budget from `linearBudgetState.ts` / `providerPollingHealth.ts`
  - provider-worker proof/debug progress that already flows into current running truth

## Parity / Alignment Matrix
- Current truth:
  - combined budgets are already assembled upstream
  - active started states still collapse to `running`
  - renderer-side event fallback logic still leaves generic text on the surface
  - the current compact rate-limit formatter still shows `% / window` text and the live surface still shows `Dashboard:` plus lumped controls
- Reference truth:
  - Symphony treats projection as authoritative, preserves workflow state, and humanizes event semantics before formatting
- Target truth / intended delta:
  - authoritative running `STAGE` and `EVENT` semantics are projected first, with the dashboard mostly formatting them
  - the steady-state rate-limit row and controls section match the issue’s display targets
- Explicitly out-of-scope differences:
  - rebuilding shared budget collection
  - unrelated status UI redesign
  - adjacent telemetry restoration or merged-closeout lanes except where current authoritative progress can be reused for event text

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused regressions for stage preservation, running event truth, compact rate-limit row formatting, and controls/dashboard layout
  - full repo validation floor before review handoff
- Rollout verification:
  - prove the changed STATUS frame with renderer output assertions and a live payload cross-check against authoritative projected values
  - record in closeout which truths were already correct on current `main` and which were changed by this lane
- Monitoring / alerts:
  - no new monitoring surface required; rely on focused automated coverage and payload/output proof

## Open Questions
- Is a dedicated `display_event` payload field the smallest truthful seam for this lane, or can the existing event/message contract be enriched enough upstream?
- Which current CO-specific review-drain/merge progress summaries can be surfaced directly without additional synthesis?

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed on repo-wide `docs:freshness` stale-doc baseline after `docs:check` passed; manual fallback accepted
- Date: 2026-04-07
- Manifest: `/Users/kbediako/Code/CO/.workspaces/linear-f71992e3-ddda-4198-b43c-97ccb36908cf/.runs/linear-f71992e3-ddda-4198-b43c-97ccb36908cf-co-103-docs-review/cli/2026-04-07T02-54-52-283Z-cd6ae8af/manifest.json`
- Review telemetry: fallback note at `out/linear-f71992e3-ddda-4198-b43c-97ccb36908cf/manual/20260407T025452Z-docs-review-fallback.md`
