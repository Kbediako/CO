---
id: 20260308-1057-coordinator-symphony-aligned-control-action-controller-extraction
title: Coordinator Symphony-Aligned Control Action Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Controller Extraction

- Task ID: `1057-coordinator-symphony-aligned-control-action-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-extraction.md`

## Scope

- Extract the remaining `/control/action` route-local controller shell out of `controlServer.ts`.
- Introduce a dedicated controller module that composes the already-extracted preflight, sequencing, execution, and finalization helpers.
- Preserve CO's explicit side-effect boundary for persistence, runtime publish, audit emission, and HTTP response/error writes.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/controlActionControllerSequencing.ts`
- `orchestrator/src/cli/control/controlActionPreflight.ts`
- `orchestrator/src/cli/control/controlActionFinalization.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated `/control/action` controller module under `orchestrator/src/cli/control/`.
2. Move the route-local orchestration into that controller module, including:
   - request body reading
   - normalization and early control-error mapping
   - tool/params derivation
   - sequencing helper invocation
   - finalization-plan application orchestration
3. Keep `controlServer.ts` responsible only for:
   - route matching
   - shared request context construction
   - injecting the explicit side-effect boundary used by the controller
4. Keep the controller boundary explicit through narrow callbacks/adapters for:
   - persistence and nonce rollback
   - runtime publish
   - audit emission
   - response/error writes
5. Do not collapse the extracted helper family back into a monolith; the controller should remain a typed integration layer over the existing modules.

## Risks / Guardrails

- Side-effect ordering must remain unchanged.
- The extraction must not hide persistence/publish/audit authority behind implicit store methods.
- Early normalization failures must continue to map to the same status/error responses.
- `controlServer.ts` should get smaller, but not at the cost of obscuring CO's mutation authority boundary.
- Real Symphony is only a structural guide here; its lack of a literal `/control/action` equivalent should not force a broader rewrite.

## Acceptance Criteria

- `controlServer.ts` delegates `/control/action` handling to a dedicated controller module.
- The dedicated controller composes the extracted helper stack without re-owning their internal logic.
- Persistence, publish, audit, and response writes remain explicit and test-covered.
- Existing `/control/action` behavior and contracts remain unchanged.

## Validation

- Direct controller tests covering happy-path apply, error mapping, and boundary callback ordering.
- Targeted `ControlServer` regressions confirming the route remains behavior-preserving.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.

## Review Notes

- 2026-03-08 local post-`1056` review identified the remaining `/control/action` concentration as the route-local controller shell, not another helper seam.
- 2026-03-08 delegated fast read-only selector agreed the next smallest useful seam is a standalone `/control/action` controller extraction and found no real-Symphony evidence forcing a different direction.
