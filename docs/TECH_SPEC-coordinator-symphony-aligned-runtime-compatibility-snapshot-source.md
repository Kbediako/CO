# TECH_SPEC - Coordinator Symphony-Aligned Runtime Compatibility Snapshot Source

## Scope

- Add a dedicated runtime compatibility snapshot source for the Symphony-aligned core compatibility API.
- Update the compatibility projection builder to consume that source instead of the selected-run runtime snapshot.
- Keep `/api/v1/state` and `/api/v1/:issue_identifier` on the existing projection-owned route seam, with `/ui/data.json`, Telegram, and `/api/v1/dispatch` unchanged.

## Files / Modules

- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a compatibility-oriented runtime snapshot source that reads the manifest/control/question state needed for `running`, `retrying`, issue lookup aliases, and selected compatibility metadata without requiring a `SelectedRunContext`.
2. Update `controlRuntime.ts` so `readCompatibilityProjection()` is backed by that dedicated source instead of `readSelectedRunSnapshot()`.
3. Keep the selected-run projection and `readSelectedRunSnapshot()` intact for UI/Telegram consumers.
4. Preserve the current bounded behavior in this slice:
   - `running` may still contain at most one entry
   - `retrying` may remain empty when no source data exists
   - no authority or transport changes
5. Add regression/manual evidence proving the compatibility source boundary changed while route payloads stayed stable.

## Constraints

- Do not broaden this slice into true multi-run aggregation.
- Do not remove or rewrite the selected-run projection used by UI/Telegram.
- Keep the compatibility route contract stable unless a test-backed correction is explicitly called out.

## Validation

- Targeted and full `ControlServer` coverage for compatibility state/issue payload stability.
- Manual mock route check proving the compatibility surface still behaves the same after the source boundary changes.
- Standard build/lint/test/docs/diff/review/pack lane before closeout.
