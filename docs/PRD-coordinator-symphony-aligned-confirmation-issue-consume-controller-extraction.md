# PRD - Coordinator Symphony-Aligned Confirmation Issue Consume Controller Extraction

## Problem

After `1045`, `controlServer.ts` still owns the inline `/confirmations/issue` and `/confirmations/consume` routes. Those two routes share the same nonce-issuance contract, but they remain embedded in the main server entrypoint instead of behind a dedicated controller seam.

## Goal

Extract a dedicated confirmation-issue-consume controller helper so the nonce issuance request and response flow lives behind one stable seam while top-level route ordering, auth and runner-only ordering, broader control behavior, `/confirmations/validate`, and the higher-risk authority paths stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` with the next smallest cohesive confirmation adapter boundary.
- Makes nonce issuance easier to reason about without widening into `/confirmations/validate` or `/control/action`.
- Prepares a cleaner confirmation surface for later hardening while keeping CO’s harder authority model explicit.

## Scope

- Extract the `/confirmations/issue` and `/confirmations/consume` route-local handling out of `controlServer.ts`.
- Move request parsing, missing-request validation, nonce issuance invocation, persistence trigger, and response writing behind that controller boundary.
- Keep the current validation rules and response contract unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No `/confirmations/validate`, `/control/action`, `/questions*`, or `/delegation/register` changes.
- No confirmation-store model changes.
- No `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, or `/api/v1/*` changes.

## Constraints

- Preserve the current `/confirmations/issue` and `/confirmations/consume` contract for required fields, status codes, and nonce issuance semantics.
- Keep `controlServer.ts` responsible for top-level route ordering plus auth and runner-only gating before the confirmation routes.
- Keep the extraction bounded to the confirmation issue and consume route cluster and its tests.
