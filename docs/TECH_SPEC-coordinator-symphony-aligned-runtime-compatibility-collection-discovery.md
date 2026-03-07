# TECH_SPEC - Coordinator Symphony-Aligned Runtime Compatibility Collection Discovery

## Scope

- Add a bounded runtime discovery layer for the Symphony-aligned core compatibility API.
- Populate compatibility `running` and `retrying` collections from discovered runtime state rather than a selected-manifest-only source.
- Keep `/api/v1/state` and `/api/v1/:issue_identifier` on the current projection-owned route seam, with `/ui/data.json`, Telegram, and `/api/v1/dispatch` unchanged.

## Files / Modules

- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/src/cli/run/runPaths.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a bounded compatibility runtime discovery helper that can enumerate recent/sibling run manifests from the repo `.runs` root derived from the current run paths.
2. Reuse the existing selected/compatibility context shaping so discovered runs are translated into compatibility source entries without moving UI/Telegram onto the new discovery path.
3. Populate compatibility `running` and `retrying` collections from discovered runtime state, while keeping selection semantics explicit and local to the existing selected-run seam.
4. Preserve the current bounded posture in this slice:
   - discovery is local and finite, not a global scheduler,
   - compatibility issue lookup remains read-only,
   - no transport or authority changes,
   - no live provider polling inside the compatibility snapshot read.
5. Add regression/manual evidence showing the compatibility API can now surface multiple discovered entries while UI/Telegram remain unchanged.

## Constraints

- Do not broaden this slice into ownership, scheduling, or cross-run control actions.
- Do not move UI/Telegram selected-run rendering onto the compatibility discovery layer.
- Keep the compatibility route contract stable unless a test-backed correction is explicitly called out.

## Validation

- Targeted and full `ControlRuntime` / `ControlServer` coverage for multi-entry compatibility state and issue payloads.
- Manual mock route check proving discovered `running` / `retrying` collections behave as expected.
- Standard build/lint/test/docs/diff/review/pack lane before closeout.
