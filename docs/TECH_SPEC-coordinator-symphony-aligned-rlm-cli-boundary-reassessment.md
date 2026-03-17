# TECH_SPEC: Coordinator Symphony-Aligned RLM CLI Boundary Reassessment

## Scope

Bounded reassessment of the binary-facing `rlm` wrapper in `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/rlmRunner.ts`
- focused `rlm` CLI docs/task artifacts

## Requirements

1. Reinspect `handleRlm(...)` and adjacent lower ownership to determine whether a truthful bounded local seam remains.
2. Distinguish same-owner wrapper glue from any real mixed-ownership candidate.
3. Record an explicit reassessment result before any implementation starts.
4. Keep the result local to the binary-facing `rlm` wrapper and avoid widening into unrelated families.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: a truthful `go` or `freeze/reassess-stop` result is recorded for the local `rlm` pocket
- `abort`: the current-tree evidence is ambiguous and no single bounded verdict can be stated
