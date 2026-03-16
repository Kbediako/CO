# TECH_SPEC: Coordinator Symphony-Aligned Setup Bootstrap Shell Extraction

## Scope

Bounded extraction of the `setup` bootstrap shell that still lives inline in `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- a new dedicated setup bootstrap shell/helper module under the orchestrator CLI sources
- `tests/cli-command-surface.spec.ts`
- adjacent focused tests only if parity coverage needs to move with the seam

## Requirements

1. Extract `handleSetup(...)` orchestration out of the top-level CLI file without changing user-facing setup behavior.
2. Move the shell-owned guidance helper surface with it if still coupled:
   - `buildSetupGuidance(...)`
   - `formatSetupGuidanceSummary(...)`
3. Preserve plan/apply branching, bundled-skill command composition, repo-root preview quoting, delegation/DevTools composition, and final guidance output parity.
4. Keep `runDelegationSetup(...)`, `runDevtoolsSetup(...)`, `installSkills(...)`, and their existing dedicated modules out of scope.
5. Keep unrelated `init`, `doctor`, `devtools`, `delegation`, and `skills` handlers unchanged unless import rewiring requires tiny edits.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused `tests/cli-command-surface.spec.ts` setup coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the setup bootstrap shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
