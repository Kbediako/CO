# PRD - Coordinator Symphony-Aligned Confirmation Create Controller Extraction

## Problem

After `1047`, `controlServer.ts` still owns the inline `/confirmations/create` route. That route now stands as the remaining mostly self-contained confirmation lifecycle adapter, but its request parsing, session restriction logic, optional auto-pause behavior, `confirmation_required` event emission, and response shaping are still embedded in the main server entrypoint.

## Goal

Extract a dedicated confirmation-create controller helper so the confirmation creation request and response flow lives behind one stable seam while top-level route ordering, auth and runner-only ordering, `/confirmations/approve`, broader control behavior, and the higher-risk authority paths stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` with the next smallest confirmation adapter boundary after validate.
- Makes confirmation creation easier to reason about without widening into the more coupled `/confirmations/approve` or `/control/action` flows.
- Preserves CO’s harder authority model while preparing a cleaner confirmation surface for later hardening.

## Scope

- Extract the `/confirmations/create` route-local handling out of `controlServer.ts`.
- Move confirmation expiry, JSON parsing, action/tool/params normalization, session restriction logic, create invocation, persistence, optional auto-pause behavior, `confirmation_required` event emission, and response writing behind that controller boundary.
- Keep the current creation rules and response contract unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No `/confirmations/approve`, `/confirmations/validate`, `/confirmations/issue`, `/confirmations/consume`, or `/control/action` changes.
- No confirmation-store model changes.
- No `/questions*`, `/delegation/register`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, or `/api/v1/*` changes.

## Constraints

- Preserve the current session-only `ui.cancel` restriction and parameter stripping behavior.
- Preserve duplicate-create auto-pause semantics so only newly created confirmations can advance pause state.
- Preserve the `confirmation_required` payload contract without leaking raw params.
- Keep `controlServer.ts` responsible for top-level route ordering plus auth and runner-only gating before the confirmation routes.
- Keep the extraction bounded to the confirmation create route cluster and its tests.
