---
id: 20260405-linear-6e5a9260-4822-453b-ba5b-aa513849e06e
title: CO: Restore authoritative CO STATUS telemetry for stage, event, tokens, throughput, session, and rate limits
relates_to: docs/PRD-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md
risk: high
owners:
  - Codex
last_review: 2026-04-05
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`
- PRD: `docs/PRD-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`
- Task checklist: `tasks/tasks-linear-6e5a9260-4822-453b-ba5b-aa513849e06e.md`

## Traceability
- Linear issue: `CO-83` / `6e5a9260-4822-453b-ba5b-aa513849e06e`
- Linear URL: https://linear.app/asabeko/issue/CO-83/co-restore-authoritative-co-status-telemetry-for-stage-event-tokens
- Follow-up to: `CO-78` / `bea56fb8-c601-4554-8ece-0a63c5fd34bc`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore authoritative live provider-worker/appserver telemetry so terminal `CO STATUS` truthfully renders stage, event, tokens, throughput, session, turn lineage, and Codex usage windows.
- Scope:
  - runtime JSONL token/event/session/rate-limit normalization in `providerLinearWorkerRunner.ts`
  - proof/read-model projection for stage/event/session/turn/tokens/rate limits
  - terminal rate-limit formatting for Codex `5-hour` and `weekly` windows when available
  - focused regression coverage and direct Linear screenshot proof
- Constraints:
  - keep the fix bounded to the current telemetry/projection seams
  - no renderer-only placeholders
  - no dashboard redesign

## Technical Requirements
- Functional requirements:
  - active provider-worker proof must carry authoritative session, turn, token, event/message, and Codex rate-limit telemetry when runtime JSONL emits it
  - header `Tokens` and `Throughput` plus row `TOKENS`, `SESSION`, and `AGE / TURN` must render truthful values or explicit unavailable semantics
  - `STAGE` must reflect operator-visible phase semantics instead of raw `in_progress`
  - `EVENT` must prefer meaningful runtime activity over low-signal generic fallback text
  - Codex `5-hour` and `weekly` usage/rate-limit windows must surface clearly when authoritative telemetry exists
- Non-functional requirements (performance, reliability, security):
  - preserve read-only status behavior
  - prefer authoritative freshness over stale compatibility fallback
  - keep throughput calculation deterministic and based on truthful total-token progression
- Interfaces / contracts:
  - proof source: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - projection: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/controlRuntime.ts`
  - renderer: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - regression coverage: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - expand runtime proof parsing to recognize richer Codex rate-limit payloads and keep event/message/session/turn updates authoritative during live turns
  - project active operator-visible phase semantics into running `display_state` without losing pause/input overlays
  - prefer proof-backed message/event/session/turn data where it is fresher and more specific than compatibility fallbacks
  - format Codex usage-window buckets in the terminal renderer without regressing the existing generic bucket format
- Data model changes / migrations:
  - no storage migration expected
  - proof/read-model payload normalization may grow to carry richer rate-limit/window metadata
- External dependencies / integrations:
  - current provider-worker JSONL output from Codex/appserver
  - Symphony local reference only

## Parity / Alignment Matrix
- Current truth:
  - proof fields exist, but active status semantics still degrade downstream
  - `display_state` is derived from raw run state rather than workflow phase
  - Codex rate limits remain stuck on a generic bucket presentation
- Reference truth:
  - Symphony keeps authoritative session/turn/token state and humanizes meaningful Codex events/rate-limit updates
- Target truth / intended delta:
  - active provider-worker telemetry stays authoritative from runtime to proof to read-model to terminal status
- Explicitly out-of-scope differences:
  - full Symphony clone
  - unrelated provider-worker lifecycle changes

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused parser/projection/dashboard regressions for live telemetry and rate-limit windows
  - full repo validation floor
- Rollout verification:
  - real-device screenshots embedded directly in Linear workpad
  - active provider-worker proof and terminal output checked together
- Monitoring / alerts:
  - rely on focused regression coverage and status proof snapshots; no new monitoring surface in this lane

## Open Questions
- Which richer Codex rate-limit payload shapes appear in current appserver-backed provider-worker runs but are not yet normalized in CO?
- Should the running-row stage surface tracked Linear phase verbatim or via a bounded normalization layer for review/merging aliases?

## Approvals
- Reviewer: `codex-orchestrator docs-review` (`clean-success`)
- Date: 2026-04-05
- Manifest: `.runs/linear-6e5a9260-4822-453b-ba5b-aa513849e06e-co-83-docs-review/cli/2026-04-05T05-31-07-283Z-0337a072/manifest.json`
- Review telemetry: `.runs/linear-6e5a9260-4822-453b-ba5b-aa513849e06e-co-83-docs-review/cli/2026-04-05T05-31-07-283Z-0337a072/review/telemetry.json`
