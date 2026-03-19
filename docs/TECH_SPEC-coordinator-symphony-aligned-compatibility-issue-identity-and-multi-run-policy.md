# TECH_SPEC - Coordinator Symphony-Aligned Compatibility Issue Identity and Multi-Run Policy

## Scope

- Define deterministic compatibility issue identity for the Symphony-aligned core `state` / `issue` surface.
- Replace latest-readable-run heuristics with explicit same-issue multi-run aggregation rules inside bounded runtime discovery.
- Preserve current-run-only UI/Telegram seams.

## Files / Modules

- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Extend bounded runtime discovery so compatibility aggregation can reason about multiple active sibling runs for the same task / issue identifier instead of choosing one latest readable run up front.
2. Make compatibility `running` and `retrying` collections issue-centered with a deterministic representative-selection rule per issue + status bucket:
   - prefer the freshest contributor by `latestEvent.at`,
   - then `updatedAt`,
   - then `startedAt`,
   - then `runId` as the final tiebreak.
3. Preserve run-id lookup as a secondary alias by carrying contributing run identifiers into compatibility issue lookup, while preferring canonical `issue_identifier` matches before alias fallback.
4. Keep selection semantics explicit and current-run-only for `/ui/data.json`, Telegram oversight, and dispatch evaluation.
5. Do not broaden this slice into scheduler ownership, retry orchestration, or transport-control changes.

## Constraints

- Keep discovery local and bounded to runtime files under `.runs`.
- Keep the compatibility route contract stable unless a test-backed correction is explicitly required.
- Keep route lookup read-only.

## Validation

- Targeted/focused `ControlRuntime` and `ControlServer` coverage for same-issue multi-run cases.
- Manual mock artifact showing deterministic issue lookup when multiple runs share one issue identity.
- Standard validation lane before closeout.
