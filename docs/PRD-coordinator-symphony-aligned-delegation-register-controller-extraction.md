# PRD - Coordinator Symphony-Aligned Delegation Register Controller Extraction

## Problem

After `1044`, `controlServer.ts` still owns the inline `/delegation/register` route. The route is a small HTTP adapter seam, but it sits inline in the main server entrypoint instead of behind a dedicated controller boundary.

## Goal

Extract a dedicated delegation-register controller helper so the `/delegation/register` request/response flow lives behind one stable seam while top-level route ordering, auth/CSRF ordering, broader control behavior, and the higher-risk authority paths stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` with the next smallest cohesive HTTP seam.
- Makes delegated token-registration handling easier to reason about without widening into `/confirmations*` or `/control/action`.
- Prepares a cleaner control-surface boundary for later hardening while keeping CO’s authority model explicit.

## Scope

- Extract the `/delegation/register` route-local handling out of `controlServer.ts`.
- Move request parsing, token registration invocation, persistence trigger, and response writing behind that controller boundary.
- Keep the current validation rules and response contract unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No `/control/action`, `/confirmations*`, or `/questions*` changes.
- No delegation-token storage model changes.
- No `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, or `/api/v1/*` changes.

## Constraints

- Preserve the current `/delegation/register` contract for required fields, status codes, and response shape.
- Keep `controlServer.ts` responsible for top-level route ordering plus auth/CSRF gating before the delegation-register route.
- Keep the extraction bounded to the `/delegation/register` route cluster and its tests.
