# PRD: Coordinator Symphony-Aligned Control Server Ready Instance Lifecycle Shell Extraction

## Problem

`1152` removed the remaining inline generic bootstrap start sequencing, but `ControlServer` still owns the higher-order ready-instance lifecycle shell inline: bind the request shell to a pending instance, publish bootstrap-owned runtime handles, run ready-instance startup with rollback on failure, and tear down owned runtime state on close.

## Goal

Extract that ready-instance lifecycle shell into a bounded adjacent seam while preserving startup order, close-on-failure rollback, owned shutdown ordering, and the current `ControlServer` public contract.

## Non-Goals

- Telegram bridge/runtime internals or Telegram command/update controller changes
- Route/controller decomposition or request-surface rewrites
- Control bootstrap metadata schema or persistence-path changes
- Expiry lifecycle policy changes
- One-line helper-only churn that does not reduce the remaining orchestration surface

## Requirements

1. A bounded ready-instance lifecycle seam owns the orchestration that currently sits inline around `ControlServer.startPendingReadyInstance(...)`, `activatePendingReadyInstance(...)`, and owned shutdown.
2. `ControlServer.start()` remains the public entrypoint and still returns a fully ready instance with the same `getBaseUrl()`, `broadcast(...)`, and `close()` behavior.
3. The extracted seam preserves request-shell binding semantics, including lazy reads of `requestContextShared` and `expiryLifecycle` during the pending-to-ready transition.
4. The extracted seam preserves startup/rollback order: bind request shell, create instance, publish bootstrap-owned runtime handles, run ready-instance startup, and close owned runtime on failure.
5. The extracted seam preserves owned shutdown ordering for expiry lifecycle, bootstrap lifecycle, SSE clients, and HTTP server close.
6. Focused regressions cover success plus rollback/cleanup behavior without reopening Telegram-local seams.

## Success Criteria

- `controlServer.ts` no longer inlines the higher-order ready-instance lifecycle shell.
- Focused ready-instance lifecycle regressions stay green on the final tree.
- The standard closeout gate bundle passes on the final tree, with explicit overrides only where evidence justifies them.
