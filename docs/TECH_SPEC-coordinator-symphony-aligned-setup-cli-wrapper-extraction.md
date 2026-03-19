# TECH_SPEC: Coordinator Symphony-Aligned Setup CLI Wrapper Extraction

## Scope

Bounded extraction of the binary-facing `setup` wrapper from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/setupBootstrapShell.ts`
- new `setup` CLI wrapper/helper under `orchestrator/src/cli/`
- focused setup CLI tests

## Requirements

1. Move setup help text, local `--format json` plus `--yes` guarding, repo flag/default resolution, and wrapper handoff out of `handleSetup(...)`.
2. Keep binary ownership limited to shared `parseArgs(...)`, top-level command dispatch, and any top-level help routing that still belongs there.
3. Preserve the current setup bootstrap behavior and error text.
4. Avoid widening into delegation/devtools/skills internals or the lower bootstrap shell behavior.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused setup CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the `setup` wrapper is extracted with focused parity evidence
- `abort`: the remaining `handleSetup(...)` ownership is shown to be too small or same-owner glue rather than a real shell boundary
