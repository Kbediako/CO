---
id: 20260306-1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction
title: Coordinator Symphony-Aligned Dispatch Presenter/Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: extract `/api/v1/dispatch` payload shaping and failure classification behind the same presenter/controller boundary now used for the other read-only observability routes.
- Scope: one docs-first registration pass, one dispatch presenter/controller extraction, and focused dispatch validation.
- Constraints: keep CO authority unchanged, keep controller-owned audit emission, and avoid Telegram/auth/webhook/mutation refactors in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1019`.
- Reasoning: `1019` finished the read-only presenter/controller split for state, issue, refresh, and UI; `/api/v1/dispatch` is the last major read-only route still shaped inline inside `controlServer.ts`.
- Initial review evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/22-next-slice-note.md`, `docs/findings/1020-dispatch-presenter-controller-extraction-deliberation.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.

## Post-Implementation Review Note
- Status: completed.
- Delegated review evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/01-docs-review-manifest.json`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/13-delegated-review-notes.md`.
- Validation evidence: `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/02-implementation-gate-manifest.json`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/03-targeted-tests.log`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/04-diff-budget-override.log`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/05-pack-smoke.log`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/09-manual-dispatch-check.json`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/10-elegance-review.md`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/11-override-notes.md`.

## Technical Requirements
- Functional requirements:
  - remove inline dispatch payload shaping and failure body construction from the `/api/v1/dispatch` route body,
  - keep `controlServer.ts` responsible for method/status/header selection and audit emission,
  - preserve current dispatch route behavior and fail-closed outcomes,
  - keep other read-only routes behavior unchanged.
- Non-functional requirements:
  - no authority widening,
  - no dispatch regression,
  - thinner controller layering than the post-1019 baseline,
  - deterministic, testable dispatch behavior.
- Interfaces / contracts:
  - `GET /api/v1/dispatch` remains authoritative,
  - no new env vars or persistent state,
  - the read-only presenter boundary remains non-mutating.

## Architecture & Data
- Architecture / design adjustments:
  - move dispatch payload shaping behind presenter/read-side code,
  - keep audit-event emission and HTTP route semantics in `controlServer.ts`,
  - continue to use `SelectedRunProjectionReader` plus dispatch-pilot evaluation as the data/evaluation boundary.
- Data model changes / migrations:
  - none.
- External dependencies / integrations:
  - existing `selectedRunProjection.ts`,
  - existing `trackerDispatchPilot.ts`,
  - existing `ControlServer`,
  - real `openai/symphony` presenter/controller files as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted `ControlServer` coverage for dispatch method/status/success/fail-closed behavior,
  - manual simulated/mock dispatch verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - delegated read-only review stream captured before or during implementation,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - rely on existing dispatch/manual artifacts,
  - keep override reasons explicit if review-wrapper or branch-scope diff-budget noise persists.

## Open Questions
- Whether the dispatch presenter surface belongs inside `observabilitySurface.ts` or in a tiny adjacent read-only module.
- Whether dispatch traceability helpers should stay controller-local even if the payload shaping moves.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
