# PRD - Coordinator Symphony-Aligned Confirmation Approve Controller Extraction

## User Request Translation

Continue the Symphony-aligned controller extraction program by taking the next bounded confirmation seam after `/confirmations/create`: extract `/confirmations/approve` into its own controller while preserving the current approval behavior and keeping broader control authority in `controlServer.ts`.

## Problem

After `1048`, `controlServer.ts` still owns the inline `/confirmations/approve` branch. That route is the next remaining confirmation lifecycle seam, but it still embeds request parsing, actor normalization, approval persistence, the `ui.cancel` fast-path, nonce issuance/validation reuse, control-state mutation, runtime publication, and response shaping directly in the main server entrypoint.

## Goal

Extract `/confirmations/approve` into a dedicated controller helper that preserves the current approval semantics and leaves higher-authority routing and cross-route policy in `controlServer.ts`.

## Non-Goals

- No changes to `/confirmations/create`, `/confirmations/issue`, `/confirmations/consume`, `/confirmations/validate`, `/control/action`, or non-confirmation routes.
- No change to confirmation-store contracts, nonce formats, or cancellation authority semantics.
- No widening into broader confirmation abstraction work unless the approval seam proves inseparable.

## Requirements

- Extract the `/confirmations/approve` route-local handling out of `controlServer.ts`.
- Preserve request-id parsing and `missing_request_id` behavior.
- Preserve actor defaulting to `ui`.
- Preserve confirmation approval persistence order.
- Preserve the special `ui.cancel` fast-path exactly:
  - issue nonce
  - validate nonce against the stored params/tool
  - persist confirmations
  - emit `confirmation_resolved`
  - update control state with cancel action
  - persist control state
  - publish runtime update
- Preserve the existing `409 confirmation_invalid`-style error mapping for fast-path failures.
- Keep `controlServer.ts` responsible for top-level auth/CSRF/runner-only gating, route ordering, shared runtime hooks, `/control/action`, and the broader transport/control policy.

## Constraints

- Preserve the current `ui.cancel` approval shortcut behavior exactly.
- Preserve the `confirmation_resolved` event payload shape.
- Do not widen into `/control/action` or transport mutation handling.
- Keep the extraction bounded and reviewable.

## Acceptance Criteria

1. `/confirmations/approve` route-local logic moves into a dedicated controller module.
2. Approval behavior, error mapping, and `ui.cancel` fast-path semantics remain unchanged.
3. `controlServer.ts` keeps top-level route ordering, auth/CSRF/runner-only gating, shared runtime/event wiring, and non-approval routes.
4. Direct controller tests, existing approval-related server regressions, manual mock evidence, and standard validation are recorded before closeout.
