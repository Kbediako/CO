---
id: 20260403-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5
title: CO: Harden CO STATUS end-to-end truth agreement, visual coverage, and legacy monitor cleanup
relates_to: docs/PRD-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md
risk: high
owners:
  - Codex
last_review: 2026-04-03
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`
- PRD: `docs/PRD-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`
- Task checklist: `tasks/tasks-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`

## Traceability
- Linear issue: `CO-76` / `44a18317-8afe-47e4-b4ba-5424aae86dc5`
- Linear URL: https://linear.app/asabeko/issue/CO-76/co-harden-co-status-end-to-end-truth-agreement-visual-coverage-and

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make the current shipped `CO STATUS` surface explicitly truthful and explicitly auditable across interactive terminal, machine-readable CLI JSON, and the authoritative HTTP/read-model surfaces.
- Scope:
  - docs-first packet and coverage matrix for the current STATUS surface
  - explicit `co-status --format json` snapshot contract
  - focused render/runtime/controller/shell regressions for shared STATUS fields and state variants
  - bounded legacy STATUS cleanup only when it directly reduces truth-path ambiguity
  - required inline screenshot proof
- Constraints:
  - preserve `control-host --format json` readiness semantics
  - reuse the existing operator-dashboard dataset instead of creating another status truth path
  - avoid broader UI/control-host redesign

## Technical Requirements
- Functional requirements:
  - `co-status --format json` must return a machine-readable STATUS snapshot, not just launch readiness metadata
  - the STATUS JSON snapshot must align with the same shared STATUS dataset used by the terminal dashboard for overlapping fields
  - `/ui/data.json` and `/api/v1/state` must remain coherent comparison surfaces for overlapping STATUS truth
  - a documented coverage matrix must exist for every currently visible STATUS field/state
  - visual proof must cover the required representative states inline in Linear
  - stale legacy naming or duplicate helper surfaces touched by this lane must be reduced when the cleanup is bounded and clearly clarifies authority
- Non-functional requirements (performance, reliability, security):
  - STATUS JSON snapshotting must stay read-only and deterministic
  - time-relative runtime/reset comparisons must use an explicit contract rather than accidental exact-equality assumptions
  - help/docs must make the STATUS JSON contract and launch/readiness split explicit
- Interfaces / contracts:
  - CLI entry surface: `bin/codex-orchestrator.ts`
  - local attach/host resolver: `orchestrator/src/cli/coStatusAttachCliShell.ts`
  - STATUS dataset builder: `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - terminal renderer: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - authoritative HTTP read surfaces: `orchestrator/src/cli/control/uiDataController.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`

## Architecture & Data
- Architecture / design adjustments:
  - introduce one explicit STATUS JSON code path that resolves the current local control-host and emits the same operator-dashboard snapshot used by the terminal/dashboard path
  - prefer a small shared helper for attach-target resolution and dashboard dataset reads instead of duplicating fetch/shape logic
  - keep `control-host --format json` on readiness output so host-start automation does not change semantics
  - if bounded legacy cleanup is warranted, target stale STATUS naming or helper seams rather than large presenter/controller deletions
- Data model changes / migrations:
  - no new authoritative read-model is introduced
  - reuse the existing operator-dashboard dataset shape and add only the smallest metadata needed for the CLI contract, if any
- External dependencies / integrations:
  - running local control-host endpoint/auth artifacts
  - authenticated `/ui/data.json`
  - compatibility `/api/v1/state`

## Coverage Matrix
| Surface / field / state | Authoritative source | Automated coverage target | Manual proof target |
| --- | --- | --- | --- |
| Header counts (`Agents`) | operator-dashboard `counts` / compatibility projection counts | dashboard render test + STATUS JSON shell test + `/api/v1/state` coherence test | normal live screenshot |
| Runtime summary | operator-dashboard `totals.seconds_running` with explicit time-relative contract | dashboard render test + STATUS JSON shell test | normal live screenshot |
| Tokens `in/out/total` | operator-dashboard `totals.*_tokens` | dashboard render test for numeric and unavailable cases + STATUS JSON shell test | normal live screenshot or degraded screenshot when unavailable |
| Rate Limits summary and `reset xxxs` | operator-dashboard `rate_limits` / polling linear budget | dashboard rate-limit render tests + STATUS JSON shell test + `/api/v1/state` coherence test | normal live or degraded screenshot |
| Polling / next refresh / checking state | operator-dashboard `polling` | dashboard polling tests + STATUS JSON shell test | normal live or degraded screenshot |
| Running rows | operator-dashboard `running[]` | dashboard full-frame tests + STATUS JSON shell test | normal live screenshot |
| Retry/backoff rows | operator-dashboard `retrying[]` | dashboard retry-row tests + runtime/controller tests + STATUS JSON shell test | retry/degraded screenshot |
| Empty / idle state | operator-dashboard zero-count snapshot | dashboard empty-state test + STATUS JSON shell test | empty/idle screenshot |
| Paused / inspect state | dashboard-local frame state over shared dataset | dashboard pause/inspect tests | paused/inspect screenshot |
| Compact / constrained-height state | dashboard-local compact frame over shared dataset | dashboard compact-state tests | compact/constrained-height screenshot |
| Snapshot/export behavior | dashboard snapshot exporter under run dir | dashboard snapshot-export tests | snapshot/export screenshot |
| Attach/live primary scrollback | attached viewer over authenticated `/ui/data.json` | attach-viewer shell tests | attach/live screenshot if needed for reviewer context |
| Legacy STATUS naming / helper cleanup | current shipped STATUS truth path | focused unit/shell regression for whichever seam is cleaned | not required unless cleanup changes operator-visible text |

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused shell tests for the new STATUS JSON contract
  - focused dashboard/render/runtime/controller tests for shared field/state truth and countdown semantics
  - full repo validation floor after implementation
- Rollout verification:
  - inline screenshots for normal live, paused/inspect, compact/constrained-height, empty/idle, and retry/degraded states
  - live host comparison against `/ui/data.json` and `/api/v1/state`
- Monitoring / alerts:
  - rely on focused regressions and device proof; this lane does not add new runtime monitoring

## Open Questions
- If legacy cleanup candidates extend beyond naming or a tiny shared-helper move, defer them to a follow-up instead of broadening this lane.

## Approvals
- Reviewer: codex-orchestrator docs-review
- Date: 2026-04-03
- Manifest: `.runs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5-co-76-docs-review/cli/2026-04-03T10-57-30-814Z-627a7b80/manifest.json`
