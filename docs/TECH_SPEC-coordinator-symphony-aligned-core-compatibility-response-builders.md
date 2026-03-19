# TECH_SPEC - Coordinator Symphony-Aligned Core Compatibility Response Builders

## Scope

- Extract the remaining Symphony-aligned core compatibility response builders out of `controlServer.ts` route-local assembly into `observabilitySurface.ts`.
- Keep `/api/v1/dispatch` on its explicit CO-only extension seam.
- Update regression coverage to keep the core-route and dispatch-extension boundary explicit.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Add response-builder helpers in `observabilitySurface.ts` for the core compatibility surface:
   - method not allowed
   - issue not found
   - route not found
   - refresh rejection
2. Keep `controlServer.ts` responsible for:
   - route selection
   - auth and method gating
   - reading request bodies
   - calling presenter/response builders
   - `writeObservabilityResponse(...)`
3. Keep the dispatch extension path separate:
   - do not fold `/api/v1/dispatch` back into the core builder group
   - do not change dispatch payload behavior

## Constraints

- Preserve current JSON payloads and traceability fields exactly unless a test-backed correction is required.
- Preserve fail-closed read-only behavior for refresh rejection and dispatch evaluation.
- Avoid introducing a new abstraction layer beyond the existing `observabilitySurface.ts` seam.

## Validation

- Targeted `ControlServer` regression coverage for core-route rejections and not-found paths.
- Manual mock route check showing core route behavior and dispatch-extension separation still hold.
- Standard build/lint/test/docs/diff/review/pack lane before closeout.
