# PRD: Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction

## Problem

After `1153`, the remaining coordinator-owned lifecycle shell in `controlServer.ts` is no longer the ready-instance internals, but the public entry shell itself: prepare startup inputs, hand off to the ready-instance lifecycle seam, and forward public shutdown through the owned runtime closer. That shell is smaller than before, but it still concentrates the remaining public startup/close orchestration for this surface.

## Goal

Extract the remaining public `ControlServer` lifecycle shell into a bounded adjacent seam while preserving the current public contract and without reopening already-extracted startup/Telegram/bootstrap seams.

## Non-Goals

- Reopening `controlServerReadyInstanceLifecycle.ts`, `controlServerReadyInstanceStartup.ts`, or `controlServerStartupSequence.ts` for behavioral rewrites
- Telegram bridge/runtime/controller changes
- Route/controller decomposition or request-surface rewrites
- Startup input schema, token/session policy, or persistence-path changes
- One-line helper churn that does not reduce the remaining public lifecycle shell

## Requirements

1. A bounded adjacent seam owns the remaining public startup/close orchestration that still sits in `ControlServer.start(...)` and `ControlServer.close()`.
2. The public `ControlServer` surface remains unchanged: `start(...)`, `getBaseUrl()`, `broadcast(...)`, and `close()`.
3. Startup order remains unchanged: prepare startup inputs, activate the ready instance, and return a fully ready public handle.
4. Close behavior remains unchanged and still routes through the owned runtime closer without losing the shared lifecycle-state semantics restored in `1153`.
5. Focused regressions cover the extracted public lifecycle shell without reopening Telegram-local seams.

## Success Criteria

- `controlServer.ts` becomes a thinner public handle type with less inline orchestration.
- Focused public lifecycle regressions stay green on the final tree.
- The standard closeout bundle passes on the final tree, with explicit overrides only where evidence justifies them.
