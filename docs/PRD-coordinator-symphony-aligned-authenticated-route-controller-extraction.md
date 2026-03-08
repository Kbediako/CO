# PRD - Coordinator Symphony-Aligned Authenticated Route Controller Extraction

## User Request Translation

Continue the Symphony-aligned `controlServer.ts` decomposition after `1064` by extracting the remaining post-gate authenticated-route handoff into a thin dedicated controller surface without weakening CO's explicit authority, public-route ordering, or protected fallback behavior.

## Problem

After `1064`, `controlServer.ts` no longer owns the authenticated route table or the authenticated controller-context assembly, but it still owns the entire post-gate authenticated handoff block:

- authenticated admission result handling
- dispatcher context creation
- dispatcher invocation
- authenticated-route handled/not-handled return path

That keeps the outer server controller denser than necessary even though the next smallest bounded seam is now isolated.

## Goal

Introduce a thin authenticated-route controller module under `orchestrator/src/cli/control/` so `controlServer.ts` keeps the public prelude, `admitAuthenticatedControlRoute(...)`, and the protected fallback response write, while the authenticated handoff block moves into a narrower dedicated seam.

## Non-Goals

- No change to public-route behavior, ordering, or carveouts.
- No change to authenticated admission policy from `1062`.
- No change to authenticated route matching from `1063`.
- No change to authenticated controller-context assembly from `1064`.
- No broad router, middleware, or framework-style abstraction.

## Requirements

- Add a dedicated authenticated-route controller module under `orchestrator/src/cli/control/`.
- Move the post-gate authenticated handoff block out of `controlServer.ts`.
- Keep `controlServer.ts` responsible for:
  - bootstrap and server lifecycle
  - public-route ordering
  - `admitAuthenticatedControlRoute(...)`
  - final protected `not_found` fallback write
- Preserve existing authenticated-route behavior exactly, including `session` vs `control` forwarding on `/control/action`.

## Constraints

- Preserve public-route ordering exactly, especially `/auth/session` and `/integrations/linear/webhook`.
- Keep explicit CO authority boundaries visible even if Symphony's controller layering is structurally cleaner.
- Keep the extraction bounded to the authenticated handoff only; do not reopen controller-local logic or cross-cutting helper ownership.

## Acceptance Criteria

1. A dedicated authenticated-route controller module exists under `orchestrator/src/cli/control/`.
2. `controlServer.ts` no longer owns the post-gate authenticated handoff block.
3. `controlServer.ts` still owns public-route ordering, authenticated admission, and final protected fallback behavior.
4. Existing authenticated-route behavior remains unchanged.
5. Direct controller-handoff coverage plus focused `ControlServer` regressions are recorded before closeout.
