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
- Objective: make selected-run compatibility/UI presenters controller-owned while keeping `readSelectedRunSnapshot()` as the runtime fact seam.
- Scope: extract `/ui`, `/state`, and `/issue` payload ownership from `ControlRuntime` only.
- Constraints: no dispatch/refresh behavior changes and no public payload regressions.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning as the immediate next slice after `1027`.
- Reasoning: `1027` solved the presenter-shaped runtime seam, leaving only transitional selected-run presentation wrappers on `ControlRuntime`. The smallest Symphony-aligned follow-up is to remove those wrappers and keep payload shaping in the controller/presenter layer.
- Initial review evidence: `out/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split/manual/20260306T192011Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegated review note:
  - `019cc4a4-b28b-79e1-89e3-3993a50b9699` recommended removing `readUiDataset()`, `readCompatibilityState()`, and `readCompatibilityIssue()` in one slice, reusing `observabilitySurface.ts` as the presenter/helper home, and leaving dispatch/refresh primitives untouched.

## Technical Requirements
- Functional requirements:
  - `ControlRuntimeSnapshot` exposes `readSelectedRunSnapshot()` and no longer exports selected-run compatibility/UI presentation wrappers.
  - `controlServer.ts` serves `/ui/data.json`, `/api/v1/state`, and `/api/v1/:issue_identifier` via presenter helpers over `readSelectedRunSnapshot()`.
  - public payloads remain backward-compatible.
- Non-functional requirements:
  - bounded ownership extraction only,
  - no provider I/O added to selected-run presenter reads,
  - preserve route/auth/audit semantics.

## Validation Plan
- targeted `ControlRuntime`, `ControlServer`, and presenter parity coverage
- full validation chain for the owned diff
- docs-review manifest, elegance review, and manual selected-run presenter evidence before closeout

## Open Questions
- Whether `observabilitySurface.ts` remains the presenter/helper home or whether extracting a narrower selected-run presenter file is measurably clearer without widening scope.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.

