---
id: 20260409-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5
title: CO STATUS: preserve canonical provider-worker activity truth and EVENT provenance end to end
relates_to: docs/PRD-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`
- PRD: `docs/PRD-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`
- Task checklist: `tasks/tasks-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`

## Traceability
- Linear issue: `CO-112` / `4a7e540f-b47d-4fa3-a083-e6e9047e68a5`
- Linear URL: https://linear.app/asabeko/issue/CO-112/co-status-preserve-canonical-provider-worker-activity-truth-and-event
- Follow-up to: `CO-109` / `bb472787-be60-44e3-ac83-a3c297dab470`

## Summary
- Objective: preserve canonical provider-worker current-turn activity end to end so STATUS selects truthful running `EVENT` text from explicit, provenance-bearing candidates instead of lossy collapsed summaries.
- Scope:
  - persist a canonical current-turn activity object through provider-worker proof writes and hydration
  - expose explicit candidate provenance, rejection reasons, and freshness timestamps through observability and compatibility surfaces
  - refactor selection so generic worker-progress text is terminal fallback only
  - add focused regressions for persistence, hydration, and winner selection
- Constraints:
  - no dashboard-only fix
  - no reopening of adjacent rate-limit, merge, or scrolling issues
  - keep `controlStatusDashboard.ts` formatter-oriented

## Implementation Boundary
- Proof persistence and hydration:
  - add a canonical activity field to `ProviderLinearWorkerProof`
  - populate it from stdout JSONL first and session-log hydration second
  - preserve `turn_id`, `session_id`, `source`, and authoritative timestamps
- Selected-run projection:
  - stop silently promoting derived progress summaries into `latestEvent` when richer canonical activity exists
  - preserve candidate provenance so later layers know which source won and which candidates were rejected
- Observability and presenter surfaces:
  - turn child-stream / child-lane summaries and generic phase text into explicit derived candidates
  - expose winning source, candidate set, rejection reasons, and freshness timestamps
- Dashboard:
  - consume authoritative message-first fields without owning the ranking policy

## Design
- Canonical activity contract:
  - minimum persisted shape: `{ event, message_or_payload, recorded_at, source, turn_id, session_id }`
  - add source-updated and summary/message timestamps needed for freshness/debugging
- Candidate ranking:
  - prefer canonical stdout JSONL activity for the active turn
  - next prefer canonical session-log hydration when it is fresher than persisted stdout truth
  - treat child summaries and progress summaries as derived candidates with explicit provenance
  - keep generic phase text as fallback only when no richer candidate survives
- Debuggability:
  - expose candidate set, winning source, rejection reasons, `source_updated_at`, `message_recorded_at`, and `summary_recorded_at`

## Validation
- `linear child-stream --pipeline docs-review`
- Focused regressions in:
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
- Full repo validation floor before review handoff

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream `co-112-docs-review` (`clean-success`)
- Manifest: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/manifest.json`
- Review telemetry: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/review/telemetry.json`
- Date: 2026-04-09
