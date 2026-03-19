# TECH_SPEC: Coordinator Symphony-Aligned Doctor CLI Request Shell Extraction

## Scope

Bounded extraction of the binary-facing doctor request-shaping shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/doctorCliShell.ts`
- new doctor request-shell helper under `orchestrator/src/cli/`
- focused doctor CLI tests

## Requirements

1. Move doctor output-format selection, toggle wiring, dependent-flag guards, `--apply` plus `--format json` incompatibility guarding, `--window-days` validation, task-filter derivation, and `repoRoot` injection out of `handleDoctor(...)`.
2. Keep shared `parseArgs(...)` ownership and top-level command dispatch local in `bin/codex-orchestrator.ts`.
3. Preserve current error text and behavior.
4. Avoid widening into lower doctor execution/output behavior or unrelated CLI families.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused doctor CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the doctor request shell is extracted with focused parity evidence
- `abort`: the remaining `handleDoctor(...)` ownership is shown to be too small or same-owner glue rather than a real shell boundary
