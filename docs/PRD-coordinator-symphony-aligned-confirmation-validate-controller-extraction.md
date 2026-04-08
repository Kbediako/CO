# PRD - Coordinator Symphony-Aligned Confirmation Validate Controller Extraction

## Problem

After `1046`, `controlServer.ts` still owns the inline `/confirmations/validate` route. That route now stands alone as the remaining bounded confirmation-validation adapter seam, but its request parsing, nonce validation, persistence, event emission, and response shaping are still embedded in the main server entrypoint.

## Goal

Extract a dedicated confirmation-validate controller helper so the nonce validation request and response flow lives behind one stable seam while top-level route ordering, auth and runner-only ordering, `/confirmations/approve`, broader control behavior, and the higher-risk authority paths stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` with the next smallest cohesive confirmation adapter boundary.
- Makes confirmation validation easier to reason about without widening into `/confirmations/approve` or `/control/action`.
- Prepares a cleaner confirmation surface for later hardening while keeping CO’s harder authority model explicit.

## Scope

- Extract the `/confirmations/validate` route-local handling out of `controlServer.ts`.
- Move request parsing, missing-confirm-nonce validation, tool and params normalization, nonce validation invocation, persistence, control-event emission, and response writing behind that controller boundary.
- Keep the current validation rules and response contract unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No `/confirmations/approve`, `/control/action`, `/questions*`, or `/delegation/register` changes.
- No confirmation-store model changes.
- No `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, or `/api/v1/*` changes.

## Constraints

- Preserve the current `/confirmations/validate` contract for required fields, status codes, tool/params defaults, and nonce-validation semantics.
- Keep `controlServer.ts` responsible for top-level route ordering plus auth and runner-only gating before the confirmation routes.
- Keep the extraction bounded to the confirmation validate route cluster and its tests.
