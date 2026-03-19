# TECH_SPEC: Coordinator Symphony-Aligned Doctor CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining local `doctor` pocket after `1286` extracted the binary-facing doctor request shell.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/doctorCliRequestShell.ts`
- docs/task mirrors for the reassessment result

## Requirements

1. Reinspect the remaining local `doctor` ownership in `bin/codex-orchestrator.ts`.
2. Determine whether any truthful local mixed-ownership seam remains after `1286`.
3. Preserve the current `doctor` command behavior; this lane is reassessment-only unless a narrower truthful seam is proven.
4. Record the freeze-or-go result explicitly with evidence.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the remaining local `doctor` pocket is closed honestly as `freeze` or moved forward honestly as `go`
- `abort`: the current-tree evidence is ambiguous enough that no single truthful reassessment result can be recorded
