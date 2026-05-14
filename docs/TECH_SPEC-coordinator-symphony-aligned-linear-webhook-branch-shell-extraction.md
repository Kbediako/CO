# TECH_SPEC - Coordinator Symphony-Aligned Linear Webhook Branch Shell Extraction

## Overview

This slice removes the remaining inline Linear webhook route shell from `controlServer.ts` while keeping overall request-entry ordering and the deeper webhook controller contract intact.

## Current State

- `controlServer.ts` still:
  - checks `url.pathname === '/integrations/linear/webhook'`
  - assembles the controller input for `handleLinearWebhookRequest(...)`
  - returns early after the webhook branch runs
- Existing modules already own the deeper contracts:
  - `linearWebhookController.ts` owns request validation, advisory-state mutation, persistence, audit emission, and runtime publish decisions
  - `controlServerAuditAndErrorHelpers.ts` already owns the emitted audit helper used by the branch
  - seeded runtime/request-context modules already own the longer-lived Linear state dependencies

## Target State

- Move only the control-server-side Linear webhook branch shell into a controller-owned entrypoint inside `linearWebhookController.ts`.
- Keep `handleRequest(...)` as the branch-order shell and have it delegate the Linear webhook route through that controller-owned branch call.
- Preserve current controller ownership and route ordering.

## Proposed API

- `handleControlLinearWebhookBranch(input): Promise<boolean>`
  - Returns `true` when the request is the Linear webhook route and the helper invoked `handleLinearWebhookRequest(...)`.
  - Returns `false` when the request is not the Linear webhook route and `handleRequest(...)` should continue.

The controller-owned branch entrypoint should encapsulate:

- `/integrations/linear/webhook` pathname detection
- controller-input assembly for:
  - `linearAdvisoryState`
  - `readRawBody`
  - `persistLinearAdvisory`
  - `emitAuditEvent`
  - `readFeatureToggles`
  - `publishRuntime`
- the route-level early return contract

## Out of Scope

- `linearWebhookController.ts` logic changes
- webhook auth/signature/timestamp policy changes
- public/UI/auth route ordering changes
- any broader control-surface router abstraction
- adding a separate route-helper module unless implementation friction proves it necessary

## Validation

- Focused tests for the extracted Linear webhook branch helper.
- Preserve existing route-level control-server behavior tests for Linear webhook requests.
- Full standard lane validation after implementation.
