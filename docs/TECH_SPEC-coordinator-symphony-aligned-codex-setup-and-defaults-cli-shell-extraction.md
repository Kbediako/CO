# TECH_SPEC: Coordinator Symphony-Aligned Codex Setup And Defaults CLI Shell Extraction

## Scope

Bounded extraction of the inline `codex setup` / `codex defaults` shell family from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new dedicated codex CLI shell module under `orchestrator/src/cli/`
- `orchestrator/src/cli/codexCliSetup.ts`
- `orchestrator/src/cli/codexDefaultsSetup.ts`
- focused codex CLI parity tests

## Requirements

1. Extract the `codex` setup/defaults shell boundary without changing user-facing behavior.
2. Preserve help gating, per-subcommand flag mapping, JSON/text output behavior, and unknown-subcommand handling.
3. Keep the underlying setup/defaults engines out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused codex CLI coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `codex` setup/defaults shell moves behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
