---
id: 20260308-1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction
title: Coordinator Symphony-Aligned Expiry Cycle and Timer Ownership Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md
related_tasks:
  - tasks/tasks-1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Expiry Cycle and Timer Ownership Extraction

## Summary

Extract the remaining expiry/background ownership cluster from `controlServer.ts` into a dedicated lifecycle module. The lifecycle owner should own the timer plus question and confirmation sweep behavior, while `controlServer.ts` keeps the HTTP shell, route wiring, SSE ownership, and Telegram bridge composition explicit.

## Scope

- Add a control-local expiry lifecycle module under `orchestrator/src/cli/control/`.
- Move the raw recurring timer and question/confirmation expiry sweep helpers out of `controlServer.ts`.
- Route both interval-driven expiry and direct on-demand expiry calls through the extracted seam.
- Add focused expiry-cycle regressions.

## Out of Scope

- Generic scheduler or timer framework work.
- New public/provider-facing behavior.
- Changes to question or confirmation storage shape.
- Broader control runtime refactors.
- Replacing explicit `controlServer.ts` lifecycle wiring with a generalized container.

## Proposed Design

### 1. Introduce a dedicated expiry lifecycle owner

Create a new control-local module, likely `controlExpiryLifecycle.ts`, that owns:

- the recurring timer,
- confirmation expiry sweep and `confirmation_resolved` emission,
- question expiry sweep and `question_closed` emission,
- question child-resolution callback invocation for expired records,
- runtime publish for question expiry,
- a single sweep entrypoint that can be reused by timer-driven and direct call sites.

The module should expose a small explicit interface that `controlServer.ts` can instantiate from its existing context/runtime stores plus the already-extracted question child-resolution adapter. The target contract is a narrow lifecycle surface such as:

- `start()`
- `close()`
- `expireConfirmations()`
- `expireQuestions()`

### 2. Keep `controlServer.ts` as the HTTP shell

`controlServer.ts` should continue to own:

- bind/listen and auth/bootstrap file writes,
- public-route ordering and authenticated dispatcher handoff,
- SSE client ownership,
- Telegram bridge composition and start/stop,
- context assembly for the expiry lifecycle owner,
- surrounding server bootstrap/shutdown behavior.

It should no longer own a raw recurring timer or the sweep bodies directly.

### 3. Preserve current sequencing and authority

The extraction must keep:

- persistence before emitted expiry events,
- existing payload shapes for `confirmation_resolved` and `question_closed`,
- non-fatal background failure handling,
- reuse of the existing question child-resolution adapter for expired questions.

### 4. Prevent overlapping sweeps

The current timer is a naked `setInterval`, but question expiry can await child control calls with a timeout. That makes overlap possible if one sweep takes longer than the interval.

The lifecycle owner must therefore serialize sweeps with either:

- a re-armed timeout, or
- an explicit in-flight guard.

Do not preserve overlapping raw-interval behavior just because it exists today.

### 5. Cover the direct call sites, not just the interval

The helper must also back the direct expiry call sites currently used from request-driven flows. If those calls stay local in `controlServer.ts`, the timer seam will shrink but the logic will remain duplicated.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new expiry lifecycle owner under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/questionChildResolutionAdapter.ts`
- `orchestrator/tests/ControlServer.test.ts`
- optional new dedicated expiry-cycle test file under `orchestrator/tests/`

## Risks

- Accidentally widening into a generic scheduler abstraction.
- Preserving naked interval overlap around slow child-resolution work.
- Regressing persistence-before-emit sequencing.
- Re-embedding child-resolution logic instead of reusing the dedicated adapter.
- Missing one of the direct expiry call sites while extracting the interval path only.

## Validation Plan

- Focused helper tests or focused `ControlServer` regressions for:
  - confirmation expiry event emission,
  - question expiry event emission,
  - expired-question child-resolution triggering,
  - direct and interval-driven expiry entrypoints.
- Standard validation bundle: delegation/spec/build/lint/test/docs/diff-budget/review/pack smoke.
