---
id: 20260306-1018-coordinator-symphony-aligned-observability-surface-extraction
title: Coordinator Symphony-Aligned Observability Surface Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-observability-surface-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: extract a presenter-style observability surface from `controlServer.ts` for read-only state/issue/refresh/UI routes.
- Scope: one dedicated observability module, one `controlServer.ts` integration pass, the smallest required route rewiring, and focused route-coherence validation.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, keep Telegram bounded, and avoid control/webhook refactors in this slice.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and observability-surface extraction as the immediate follow-up to `1017`.
- Reasoning: `1017` already created the selected-run projection seam; the next durable reduction is to make the read-only controller surface thin in the Symphony sense while keeping CO’s harder authority model intact.
- Initial review evidence: `docs/findings/1018-observability-surface-extraction-deliberation.md`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/12-next-slice-observability-surface.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegated review + docs-review override evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T101139Z-preimpl-review-and-docs-review-override/00-summary.md`, `.runs/1018-coordinator-symphony-aligned-observability-surface-extraction/cli/2026-03-06T09-59-37-118Z-a5ddc7a7/manifest.json`, `.runs/1018-coordinator-symphony-aligned-observability-surface-extraction/cli/2026-03-06T10-07-47-190Z-bbd3ba16/manifest.json`.

## Technical Requirements
- Functional requirements:
  - extract read-only response shaping for `/api/v1/state`, `/api/v1/:issue`, `/api/v1/refresh`, and `/ui/data.json` into one dedicated module under `orchestrator/src/cli/control/`,
  - keep `SelectedRunProjectionReader` as the source of selected-run state for the extracted surface,
  - preserve current compatibility route behavior, including explicit not-found and read-only refresh responses,
  - keep `controlServer.ts` responsible for auth, routing, webhook ingress, and mutating controls.
- Non-functional requirements:
  - no public behavior regression on the covered read-only surfaces,
  - no authority widening,
  - smaller route-host concentration in `controlServer.ts`,
  - deterministic, testable response construction.
- Interfaces / contracts:
  - existing read-only routes remain authoritative,
  - no new env vars or secret storage contracts are introduced,
  - the observability module remains presentation/read-side only.

## Architecture & Data
- Architecture / design adjustments:
  - introduce a dedicated observability-surface module,
  - keep projection construction in `selectedRunProjection.ts`,
  - compose the new module on top of the projection reader instead of bypassing it.
- Data model changes / migrations:
  - none at repo or runtime storage level.
- External dependencies / integrations:
  - existing `selectedRunProjection.ts`,
  - existing `ControlServer`,
  - real `openai/symphony` presenter/controller files as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted `ControlServer` coverage for state/issue/refresh/UI routes,
  - manual simulated/mock observability-surface verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - delegated read-only review stream captured before or during implementation,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - rely on existing route/manual artifacts,
  - keep override reasons explicit if review-wrapper or diff-budget noise persists.

## Open Questions
- Whether compatibility read-only error payload construction should move with the observability surface or remain partly local to `controlServer.ts`.
- Whether a later slice should also move `/api/v1/dispatch` onto the same presenter-style boundary once the state/issue/refresh/UI routes are extracted.

## Closeout Notes
- `1018` closed as a bounded extraction slice with the shared observability surface now owning read-only state/issue/refresh/UI response shaping.
- Validation and manual mock evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/00-summary.md`.
- Elegance review and next-slice recommendation: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/12-elegance-review.md`, `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/15-next-slice-note.md`.
- Review-stage override evidence: `out/1018-coordinator-symphony-aligned-observability-surface-extraction/manual/20260306T104120Z-closeout/13-override-notes.md`.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
