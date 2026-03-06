---
id: 20260306-1019-coordinator-symphony-aligned-observability-presenter-controller-split
title: Coordinator Symphony-Aligned Observability Presenter/Controller Split
relates_to: docs/PRD-coordinator-symphony-aligned-observability-presenter-controller-split.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: convert the current observability-surface hybrid into a cleaner Symphony-style presenter/controller split.
- Scope: one presenter-oriented surface refactor, one `controlServer.ts` controller remap for state/issue/refresh/UI routes, and focused validation.
- Constraints: keep CO execution authority unchanged, keep `/api/v1/dispatch` local, and avoid webhook/mutation refactors in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1018`.
- Reasoning: `1018` landed the extracted read-side surface; the next durable reduction is to make that surface payload-oriented and return HTTP ownership to the controller layer, matching the real Symphony structure more closely without broadening CO scope.
- Initial review evidence: `docs/findings/1019-observability-presenter-controller-split-deliberation.md`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/15-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegated review synthesis: the bounded `gpt-5.4` review stream confirmed the remaining HTTP-shaped coupling in `observabilitySurface.ts`, kept `/api/v1/dispatch` and all auth/webhook/mutation surfaces out of scope, and recommended targeted `ControlServer` plus `TelegramOversightBridge` regression coverage before the full validation chain. Evidence: `docs/findings/1019-observability-presenter-controller-split-deliberation.md`.

## Technical Requirements
- Functional requirements:
  - remove HTTP-shaped return contracts from `observabilitySurface.ts`,
  - keep `controlServer.ts` responsible for method/status/header/error mapping on the covered read-only routes,
  - preserve current behavior for state/issue/refresh/UI routes,
  - keep `/api/v1/dispatch` and mutating paths outside the slice.
- Non-functional requirements:
  - no public behavior regression on the covered routes,
  - no authority widening,
  - clearer controller/presenter separation than `1018`,
  - deterministic, testable route behavior.
- Interfaces / contracts:
  - existing read-only routes remain authoritative,
  - no new env vars or secret storage contracts are introduced,
  - the observability module remains presentation/read-side only.

## Architecture & Data
- Architecture / design adjustments:
  - `observabilitySurface.ts` becomes payload-oriented,
  - `controlServer.ts` becomes the method/status/header mapper for the covered routes,
  - `SelectedRunProjectionReader` remains the selected-run data boundary.
- Data model changes / migrations:
  - none at repo or runtime storage level.
- External dependencies / integrations:
  - existing `selectedRunProjection.ts`,
  - existing `ControlServer`,
  - real `openai/symphony` presenter/controller files as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted `ControlServer` coverage for method/status/error behavior,
  - manual simulated/mock observability route verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - delegated read-only review stream captured before or during implementation,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - rely on existing route/manual artifacts,
  - keep override reasons explicit if review-wrapper or branch-scope diff-budget noise persists.

## Open Questions
- Whether compatibility error/traceability helpers should live directly in `controlServer.ts` or in a tiny controller-local helper beside it.
- Whether any tracked/manifest helper deduplication should be left entirely for a later slice.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.

## Post-Implementation Closeout Note
- Outcome: completed as a bounded presenter/controller split for the read-only observability routes, including the final controller-local error-envelope cleanup and explicit `/ui/data.json` method gating.
- Validation evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/00-summary.md`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/05-targeted-tests.log`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/06-test.log`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/20-elegance-review.md`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/21-override-notes.md`.
- Follow-up recommendation: the next smallest Symphony-aligned slice is a docs-first dispatch presenter/controller extraction lane. Evidence: `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/22-next-slice-note.md`.
