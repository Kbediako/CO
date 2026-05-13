---
id: 20260408-linear-bb472787-be60-44e3-ac83-a3c297dab470
title: CO STATUS: tighten post-CO-107 live EVENT truth and operator telemetry freshness
relates_to: docs/PRD-linear-bb472787-be60-44e3-ac83-a3c297dab470.md
risk: high
owners:
  - Codex
last_review: 2026-04-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bb472787-be60-44e3-ac83-a3c297dab470.md`
- PRD: `docs/PRD-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`
- Task checklist: `tasks/tasks-linear-bb472787-be60-44e3-ac83-a3c297dab470.md`

## Traceability
- Linear issue: `CO-109` / `bb472787-be60-44e3-ac83-a3c297dab470`
- Linear URL: https://linear.app/asabeko/issue/CO-109/co-status-tighten-post-co-107-live-event-truth-and-operator-telemetry
- Follow-up to: `CO-107` / `0001b15c-e8cc-4ce9-ad45-c898e326420e`

## Summary
- Objective: tighten authoritative running `EVENT` truth and operator telemetry freshness without reopening already-correct runtime, throughput, or complexity semantics.
- Scope:
  - enrich the authoritative `display_event` selection path so high-signal worker or debug truth wins over generic progress filler
  - surface explicit freshness or staleness age for rate-limit or progress telemetry using authoritative timestamps
  - add focused regression coverage and proof that current runtime ticking, throughput, and complexity behavior remain unchanged
- Constraints:
  - no reopening of `CO-103`, `CO-107`, or `CO-108`
  - no throughput-window or complexity-semantics changes
  - no dashboard redesign

## Implementation Boundary
- Read-model / projection:
  - keep `compatibilityIssuePresenter.ts` authoritative for `display_event`
  - add the smallest explicit freshness surface needed, so operators can distinguish local rerender cadence from source freshness
- Polling health:
  - extend `providerPollingHealth.ts` only as needed to expose truthful source freshness for shared Linear budget or refresh telemetry
- Dashboard:
  - render the new freshness truth without weakening the current 1-second local ticking behavior
  - keep presentation secondary to authoritative projected fields

## Design
- Running `EVENT`:
  - continue preferring budget-exhaustion events when they are the authoritative current truth
  - otherwise rank available non-generic worker, debug, and nearby child-stream or child-lane summaries ahead of generic fallback text
  - keep generic strings legal only when no richer authoritative message exists
- Freshness:
  - compute freshness from authoritative timestamps, not from local rerender cadence
  - expose enough operator-visible detail that shared Linear budget or progress data cannot look 1-second fresh just because the UI rerendered
- Guardrails:
  - preserve current `Runtime`, `AGE / TURN`, fallback event-age ticking, 5-second throughput window, and remaining-based complexity semantics

## Validation
- `linear child-stream --pipeline docs-review`
- focused regressions in:
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ControlStatusDashboard.test.ts`
- full repo validation floor before review handoff
- proof cross-checks between rendered screenshots and payload truth

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-08
- Manifest: `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470-co-109-docs-review/cli/2026-04-08T09-38-27-493Z-da4100bc/manifest.json`
- Review telemetry: fallback note at `out/linear-bb472787-be60-44e3-ac83-a3c297dab470/manual/20260408T093827Z-docs-review-fallback.md`
