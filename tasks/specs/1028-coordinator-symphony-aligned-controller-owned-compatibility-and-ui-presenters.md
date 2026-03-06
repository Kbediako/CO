---
id: 20260306-1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters
title: Coordinator Symphony-Aligned Controller-Owned Compatibility + UI Presenters
relates_to: docs/PRD-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: move selected-run compatibility/UI payload ownership out of `ControlRuntime` and into controller/presenter helpers over `readSelectedRunSnapshot()`.
- Scope: `/ui`, `/state`, and `/issue` selected-run presentation only.
- Constraints: no dispatch or refresh behavior changes; keep payloads stable.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning as the immediate next slice after `1027`.
- Reasoning: `1027` removed the presenter-shaped runtime seam. The remaining step is to remove the transitional selected-run presentation wrappers from `ControlRuntime` so the controller/presenter layer owns public payload shaping.
- Initial review evidence: `docs/findings/1028-controller-owned-compatibility-and-ui-presenters-deliberation.md`, `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegated review note:
  - `019cc4a4-b28b-79e1-89e3-3993a50b9699` recommended removing `readUiDataset()`, `readCompatibilityState()`, and `readCompatibilityIssue()` in one slice while leaving dispatch/refresh primitives untouched.

## Technical Requirements
- Functional requirements:
  - `ControlRuntimeSnapshot` keeps `readSelectedRunSnapshot()` and drops the three selected-run presentation wrappers,
  - `controlServer.ts` and presenter helpers own `/ui`, `/state`, and `/issue` payload shaping,
  - public payloads remain backward-compatible.
- Non-functional requirements:
  - bounded ownership extraction only,
  - no new provider I/O on selected-run presenter reads,
  - preserve route/auth/audit behavior.

## Validation Plan
- targeted parity coverage for `ControlRuntime`, `ControlServer`, and presenter helpers
- full validation chain for the owned diff
- docs-review manifest, elegance review, and manual selected-run presenter evidence before closeout

## Open Questions
- Whether `observabilitySurface.ts` stays the helper home for this slice or whether a narrower selected-run presenter helper is clearer without widening the scope.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.

