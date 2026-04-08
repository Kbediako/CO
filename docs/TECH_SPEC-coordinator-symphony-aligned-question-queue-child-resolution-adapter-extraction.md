---
id: 20260308-1068-coordinator-symphony-aligned-question-queue-child-resolution-adapter-extraction
title: Coordinator Symphony-Aligned Question Queue Child-Resolution Adapter Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-question-queue-child-resolution-adapter-extraction.md
related_tasks:
  - tasks/tasks-1068-coordinator-symphony-aligned-question-queue-child-resolution-adapter-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Question Queue Child-Resolution Adapter Extraction

## Summary

Extract the remaining question/delegation support cluster from `controlServer.ts` into a dedicated adapter module. The adapter should own child-resolution support, control-endpoint loading, manifest/path safety checks, and delegation-header parsing/validation helpers that are already consumed through explicit question-route callbacks.

## Scope

- Add a question child-resolution adapter module under `orchestrator/src/cli/control/`.
- Move the helper cluster currently supporting the extracted question controller out of `controlServer.ts`.
- Keep `questionQueueController.ts` and `authenticatedRouteComposition.ts` on explicit callback-based contracts.
- Add focused adapter/controller regressions.

## Out of Scope

- Cross-file deduplication with `orchestrator/src/cli/delegationServer.ts`.
- Changes to question persistence/storage shape.
- New provider-facing ingress or webhook behavior.
- Broader authenticated-route or control-action refactors.
- Replacing explicit callback contracts with a generalized container abstraction.

## Proposed Design

### 1. Introduce a dedicated question child-resolution adapter

Create a new control-local module, likely `questionChildResolutionAdapter.ts`, that owns:

- delegation-header parsing,
- delegation-token validation adapter,
- manifest-path resolution and manifest loading,
- child-awaiting-question inspection,
- child control-endpoint loading and authenticated request execution,
- queueing/retrying child-resolution side effects for non-queued records.

The module should expose a small explicit interface that `controlServer.ts` can instantiate from its existing request/runtime/config stores.

Direct call sites outside the controller/composition seam must stay covered in this slice:

- `readQuestions(...)` currently re-enqueues non-queued resolution attempts via `queueQuestionResolutions(...)`.
- `expireQuestions(...)` currently invokes child resolution directly for expired questions.

If those call sites are not retargeted through the adapter, behavior will drift even if the question controller callbacks are rewired correctly.

### 2. Keep controller/composition surfaces explicit

`authenticatedRouteComposition.ts` should continue to wire `handleQuestionQueueRequest(...)` through explicit fields:

- `readDelegationHeaders`
- `validateDelegation`
- `resolveManifestPath`
- `readManifest`
- `queueQuestionResolutions`
- `resolveChildQuestion`

The difference is that those callbacks should now be thin wrappers over the extracted adapter instead of local helper functions inside `controlServer.ts`.

### 3. Preserve authority and failure semantics

The adapter should preserve current semantics:

- only auto-resolve child runs for question-owned resolution paths,
- only operate on allowed run roots,
- only call child control endpoints on allowed hosts,
- keep failures non-fatal,
- emit the same fallback audit event pattern through existing `controlServer.ts` event wiring.

### 4. Avoid premature delegation-server sharing

`delegationServer.ts` contains similar control-endpoint loading helpers. This slice should not merge those surfaces unless the shared extraction is clearly smaller and does not widen validation scope. Default posture: keep `1068` bounded to the control/question lane.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new question child-resolution adapter under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/authenticatedRouteComposition.ts`
- `orchestrator/src/cli/control/questionQueueController.ts`
- `orchestrator/tests/ControlServer.test.ts`
- optional new dedicated adapter test file under `orchestrator/tests/`

## Risks

- Accidentally widening scope into cross-subsystem sharing with `delegationServer.ts`.
- Hiding control authority inside a generic adapter object that obscures ownership.
- Regressing manifest-root or token-path safety checks while moving helpers.
- Missing retry/resolution behavior that currently happens when answered/dismissed questions are listed later.

## Validation Plan

- Focused adapter tests or focused `ControlServer` regressions for:
  - delegation header parsing and validation path,
  - child control endpoint loading/safety checks,
  - answer/dismiss/expiry/list-triggered child resolution.
- Existing composition/controller tests for the question route wiring.
- Standard validation bundle: delegation/spec/build/lint/test/docs/diff-budget/review/pack smoke.
