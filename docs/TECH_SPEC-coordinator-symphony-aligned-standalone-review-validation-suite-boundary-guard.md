# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Validation-Suite Boundary Guard

## Goal

Extend the shared `ReviewExecutionState` owner so bounded standalone review fails closed on explicit package-manager validation suites in default mode instead of treating them as advisory heavy commands.

## Scope

- Add validation-suite boundary classification to `scripts/lib/review-execution-state.ts`.
- Surface a distinct bounded failure projection for explicit package-manager suite launches.
- Wire `scripts/run-review.ts` to terminate on that projection while preserving `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`.
- Add targeted regression coverage for the `1064` / `1065` failure shape.

## Design

### 1. Promote explicit validation suites from advisory to boundary violation

The existing runtime already recognizes heavy validation suite launches. This slice reuses that knowledge and narrows it:

- explicit package-manager suite invocations for `test`, `lint`, `build`, `docs:check`, and `docs:freshness`
- across `npm`, `pnpm`, `yarn`, and `bun`

In bounded review mode, those launches should no longer stay advisory. They should project as a command-intent boundary violation unless `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1` is set.

### 2. Keep runtime ownership centralized

`ReviewExecutionState` remains the single owner for:

- detecting the suite-launch shape from command facts
- deciding whether the current mode should fail closed
- exposing a stable failure reason for artifact/log consumers

The wrapper should continue to consume that state rather than duplicating command parsing.

### 3. Thin wrapper termination only

`scripts/run-review.ts` should:

- observe the new validation-suite boundary state
- terminate promptly with the same artifact-first posture used for other bounded failures
- avoid widening into special-case semantic logic about specific command strings

### 4. Preserve the explicit escape hatch

`CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1` remains the explicit opt-in for broader review sessions. The new boundary only changes default bounded mode.

## Constraints

- Do not reopen the already-closed `1059` / `1060` / `1061` heuristics except where needed to support this new explicit boundary.
- Do not broaden into generic “all heavy commands are fatal” policy.
- Do not mix child-process reaping or quiet-tail cleanup into this seam unless directly required to terminate promptly on the new boundary.

## Validation

- targeted classification/runtime regressions in `tests/run-review.spec.ts`
- standard build/lint/test/docs checks
- `pack:smoke`
