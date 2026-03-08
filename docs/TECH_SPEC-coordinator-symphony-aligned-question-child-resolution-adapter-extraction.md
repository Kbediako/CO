---
id: 20260308-1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction
title: Coordinator Symphony-Aligned Question Child-Resolution Adapter Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md
related_tasks:
  - tasks/tasks-1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Question Child-Resolution Adapter Extraction

## Summary

Extract the child-run question-resolution adapter assembly from `controlServer.ts` into a dedicated control-local module. The extracted seam should own request-context-to-adapter composition plus fallback audit emission wiring, while `controlServer.ts` keeps route admission, helper sequencing, and provider-facing behavior explicit.

## Scope

- Add a control-local child-resolution adapter module under `orchestrator/src/cli/control/`.
- Move `createRequestQuestionChildResolutionAdapter(...)` and the closely related fallback event wiring out of `controlServer.ts`.
- Add focused regressions for the extracted seam.

## Out of Scope

- Telegram oversight extraction.
- Route/controller rewiring.
- `questionChildResolutionAdapter.ts` internal behavior changes.
- Generic dependency container abstractions.

## Proposed Design

### 1. Introduce a dedicated control-local child-resolution assembly module

Create a module, likely something like `controlQuestionChildResolution.ts`, that owns:

- composing the adapter from request-context policy/state,
- binding fallback event emission back to control-event transport,
- returning the already-configured adapter used by expiry and authenticated question flows.

### 2. Keep `controlServer.ts` as the outer shell

`controlServer.ts` should continue to own:

- request handling and authenticated dispatch,
- expiry/bootstrap lifecycle ownership,
- Telegram/helper sequencing,
- audit emitter ownership outside the extracted adapter seam.

### 3. Preserve current semantics

The extraction must keep:

- allowed run-root and host policy,
- delegation token validation,
- parent-run identity lookup,
- fallback audit event shape and emission behavior,
- existing child-question route/helper sequencing.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new control-local child-resolution assembly module under `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`
- optional new dedicated unit test under `orchestrator/tests/`

## Risks

- Widening into route extraction.
- Accidentally changing fallback event behavior.
- Breaking expiry-driven child question resolution.
- Blurring core run-coordination logic with provider-specific helpers.

## Validation Plan

- Focused regressions for:
  - assembled adapter behavior,
  - unchanged fallback event emission,
  - unchanged question route behavior,
  - unchanged expiry-driven child-question handling.
- Standard docs-first guard bundle before implementation.
