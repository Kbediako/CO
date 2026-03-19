# TECH_SPEC - Coordinator Symphony-Aligned Compatibility Issue Presenter Extraction

## Scope

- Extract compatibility issue presenter policy from `observabilityReadModel.ts`.
- Keep `state` / `issue` route payloads stable.
- Preserve the selected-run seam for UI/Telegram/dispatch evaluation.

## Files / Modules

- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Move compatibility-only issue presenter concerns into a dedicated helper/module:
   - issue aggregation by canonical `issueIdentifier`,
   - deterministic representative selection,
   - alias union and canonical-before-alias lookup,
   - running/retry entry assembly,
   - issue payload assembly for `state` / `issue`.
2. Keep selected-run payload construction in `observabilityReadModel.ts`.
3. Keep route/controller logic in `observabilitySurface.ts` limited to calling the compatibility presenter rather than rebuilding lookup policy inline.
4. Preserve the `1035` route contract and the current selected-run/UI/Telegram boundary.

## Constraints

- No behavior regressions from `1035`.
- No new authority or transport behavior.
- No route contract changes unless a test-backed correction is required.

## Validation

- Targeted `ControlRuntime` and `ControlServer` regressions covering the extracted presenter path.
- Manual mock artifact confirming the extracted helper returns the same same-issue compatibility outcome as `1035`.
- Standard validation lane before closeout.
