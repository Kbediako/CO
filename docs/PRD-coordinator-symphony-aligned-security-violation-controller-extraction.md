# PRD - Coordinator Symphony-Aligned Security Violation Controller Extraction

## Problem

After `1043`, `controlServer.ts` still owns the inline `/security/violation` route. That route is a narrow HTTP adapter seam, but it is still mixed into the main server entrypoint instead of living behind a dedicated controller boundary.

## Goal

Extract a dedicated security-violation controller helper so the `/security/violation` request/response flow lives behind one stable seam while top-level route ordering, auth/CSRF ordering, broader control behavior, and the higher-risk authority paths stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` with the next smallest cohesive HTTP seam.
- Makes the redacted security-violation ingress easier to reason about without widening into the higher-risk `/delegation/register`, `/confirmations*`, or `/control/action` flows.
- Prepares a cleaner control-surface boundary for later hardening while keeping CO’s authority model explicit.

## Scope

- Extract the `/security/violation` route-local handling out of `controlServer.ts`.
- Move request parsing, redacted payload shaping, event emission, and response writing behind that controller boundary.
- Keep the current payload defaults and response contract unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No `/control/action`, `/confirmations*`, or `/delegation/register` changes.
- No `/questions*`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, or `/api/v1/*` changes.
- No background helper or broader audit pipeline refactors.

## Constraints

- Preserve the current `/security/violation` contract for defaulted payload shape and response status/body.
- Keep `controlServer.ts` responsible for top-level route ordering plus auth/CSRF gating before the security-violation route.
- Keep the extraction bounded to the `/security/violation` route cluster and its tests.
