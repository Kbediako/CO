# TECH_SPEC - Coordinator Symphony-Aligned Collection-Backed Compatibility Projection

## Scope

- Add a collection-backed compatibility projection builder on top of the current selected-run runtime snapshot.
- Route `/api/v1/state` and `/api/v1/:issue_identifier` through that projection instead of reading `snapshot.selected` directly.
- Keep `/api/v1/dispatch`, `/ui/data.json`, and Telegram/UI selected-run consumers unchanged except for shared type updates if needed.

## Files / Modules

- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Add a compatibility projection type in `observabilityReadModel.ts` that can represent:
   - `running` entries
   - `retrying` entries
   - lookup metadata for issue resolution
   - the existing selected-run payload as an additive field where needed
2. Build that compatibility projection from the current selected-run runtime snapshot rather than introducing repo-wide run aggregation in this slice.
3. Update `controlRuntime.ts` to expose the compatibility projection alongside the existing selected-run snapshot.
4. Update `observabilitySurface.ts` so:
   - `readCompatibilityState(...)` reads `running`/`retrying` from the projection
   - `readCompatibilityIssue(...)` resolves from the projection rather than directly from `snapshot.selected`
5. Keep current boundaries intact:
   - selected-run snapshot remains for UI/Telegram
   - `/api/v1/dispatch` remains a CO-only extension
   - no transport or authority changes

## Constraints

- Preserve the current public compatibility route contract unless a test-backed correction is deliberately called out.
- Avoid speculative multi-run/repo-wide aggregation in this slice.
- Keep the new projection builder small and derived from the existing runtime snapshot, not a new persistence layer.

## Validation

- Targeted `ControlServer` regression coverage for compatibility state and issue routes.
- Manual mock route check proving state/issue parity on the current selected-run-backed runtime while the internal projection shape changes.
- Standard build/lint/test/docs/diff/review/pack lane before closeout.
