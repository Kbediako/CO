# PRD - Coordinator Symphony-Aligned Control Action Controller Extraction

## User Request Translation

Continue the Symphony-aligned `/control/action` decomposition after `1056` by extracting the remaining route-local controller shell into a dedicated controller module without weakening CO's explicit mutation, persistence, publish, audit, or HTTP-response authority boundaries.

## Problem

After the preflight, outcome, cancel-confirmation, execution, finalization, and sequencing extractions, `controlServer.ts` still contains one remaining `/control/action` concentration: the route-local controller shell. The branch still owns:

- request body reading
- request normalization and early error mapping
- tool/params derivation
- finalization-application wiring
- inline orchestration between the extracted helpers and the route boundary

That is smaller than the earlier seams, but it still keeps `/control/action` more coupled to `controlServer.ts` than the current Symphony-aligned target shape.

## Goal

Introduce a dedicated `/control/action` controller module under `orchestrator/src/cli/control/` so `controlServer.ts` only performs route matching and dependency injection for this surface, while the controller module owns the route-local orchestration. Preserve CO's stronger authority model by keeping persistence, runtime publish, audit emission, and HTTP response/error writes explicit in the injected boundary rather than hidden behind opaque abstractions.

## Non-Goals

- No change to external `/control/action` request or response contracts.
- No change to status codes, error codes, replay semantics, confirmation semantics, or transport nonce durability behavior.
- No move of shared auth, CSRF handling, or route registration out of `controlServer.ts`.
- No move of preflight rules, execution logic, finalization planning, or controller sequencing logic back into one module.
- No literal adoption of Symphony runtime semantics where they would weaken CO's explicit mutation authority or audit-at-the-edge posture.

## Requirements

- Add a dedicated controller module for `/control/action` under `orchestrator/src/cli/control/`.
- Move the route-local orchestration out of `controlServer.ts`, including:
  - request body reading
  - normalization / early error mapping
  - tool/params derivation
  - sequencing helper invocation
  - finalization-plan application orchestration
- Keep the final side-effect boundary explicit through injected controller callbacks/adapters for:
  - persistence
  - runtime publish
  - audit emission
  - HTTP response/error writes
- Keep `controlServer.ts` limited to route matching and wiring/injection for this surface.

## Constraints

- Preserve current side-effect ordering exactly.
- Preserve the current split between extracted helpers; do not collapse the route into one opaque “run everything” helper.
- Keep the controller contract typed and auditable.
- Treat real Symphony as a structural reference only; CO must remain stricter where mutation authority and auditability matter.

## Acceptance Criteria

1. A dedicated `/control/action` controller module exists under `orchestrator/src/cli/control/`.
2. `controlServer.ts` no longer contains the route-local `/control/action` orchestration shell.
3. Persistence, runtime publish, audit emission, and HTTP response/error writes remain explicit and test-covered.
4. Existing `/control/action` behavior remains unchanged.
5. Direct controller coverage, targeted `ControlServer` regressions, and standard validation are recorded before closeout.
