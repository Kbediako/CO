# PRD - Coordinator Symphony-Aligned Question Queue Controller Extraction

## Problem

After `1042`, `controlServer.ts` still owns the inline `/questions*` route cluster. That block mixes route-local request parsing, question queue mutations, child-question resolution, and response shaping into the main server entrypoint instead of behind a dedicated controller boundary.

## Goal

Extract a dedicated questions controller helper so the `/questions`, `/questions/enqueue`, `/questions/answer`, `/questions/dismiss`, and `/questions/:id` request/response flow lives behind one stable seam while auth/CSRF ordering, expiry/background helpers, Telegram projection hooks, and broader control behavior stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` with the next cohesive inline controller cluster.
- Makes the queued-question surface easier to reason about without widening into the higher-risk `/control/action` transport/idempotency policy.
- Prepares a cleaner seam for later Telegram and delegation-flow hardening while keeping CO’s authority model explicit.

## Scope

- Extract the `/questions*` route-local handling out of `controlServer.ts`.
- Move request parsing, route-local question queue mutations, child-question resolution, and response shaping behind that controller boundary.
- Keep the current question payloads, status codes, and runtime-side effects unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No `/control/action`, `/confirmations*`, `/security/violation`, or `/delegation/register` changes.
- No question expiry timer or background helper extraction.
- No Telegram bridge, webhook, `/ui`, or `/api/v1/*` changes.

## Constraints

- Preserve the current `/questions*` contract for payload shape, status codes, and queue mutations.
- Keep `controlServer.ts` responsible for top-level route ordering plus auth/CSRF gating before the questions subtree.
- Keep the extraction bounded to the question-route cluster and its tests.
