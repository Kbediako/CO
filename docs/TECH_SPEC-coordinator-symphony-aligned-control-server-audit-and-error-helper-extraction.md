# TECH_SPEC - Coordinator Symphony-Aligned Control Server Audit and Error Helper Extraction

## Overview

`1088` extracts the remaining audit/error helper cluster from `orchestrator/src/cli/control/controlServer.ts`. The target seam is the local helper surface around:
- `emitLinearWebhookAuditEvent(...)`
- `emitDispatchPilotAuditEvents(...)`
- `emitControlActionAuditEvent(...)`
- `buildControlActionTracePayload(...)`
- `writeControlError(...)`

The extraction should move payload shaping and shared JSON error response writing behind one bounded helper module while preserving current route/controller behavior.

## Current Behavior

- `controlServer.ts` owns request entry, route branching, UI/static asset helpers, body parsing, and the audit/error helper cluster.
- The authenticated route controller already accepts injected callbacks for:
  - control error writes,
  - dispatch-pilot audit emission,
  - control-action audit emission.
- Linear webhook handling already receives an injected `emitAuditEvent(...)` callback.

## Proposed Changes

1. Add one bounded helper module
- Introduce a control-local helper module for the audit/error cluster.
- That helper should own:
  - Linear webhook audit event payload shaping
  - dispatch-pilot evaluated/viewed audit event payload shaping
  - control-action applied/replayed audit payload shaping
  - the shared JSON control error write helper

2. Keep `controlServer.ts` as the request-entry shell
- `handleRequest(...)` should still branch between:
  - health/root/UI routes
  - UI session issuance
  - Linear webhook handling
  - authenticated route handling
- It should delegate to the new helper module when wiring:
  - `emitAuditEvent`
  - `onDispatchEvaluated`
  - `emitControlActionAuditEvent`
  - `writeControlError`

3. Preserve current contracts
- No event name changes.
- No event payload field changes.
- No HTTP status or response body changes from `writeControlError(...)`.

## Constraints

- Keep the change bounded to `controlServer.ts` plus the new helper/tests.
- Do not reopen startup/runtime bundle surfaces completed in `1087`.
- Do not change authenticated-route controller or Linear webhook controller contracts beyond updated helper imports/wiring.

## Validation

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
- Focused control-server audit/error regressions
