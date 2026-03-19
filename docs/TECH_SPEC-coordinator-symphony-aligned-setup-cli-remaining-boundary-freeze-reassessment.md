# TECH_SPEC: Coordinator Symphony-Aligned Setup CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining local `setup` pocket after `1283` extracted the binary-facing `setup` shell.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/setupCliShell.ts`
- docs/task mirrors for the reassessment result

## Requirements

1. Reinspect the remaining local `setup` ownership in `bin/codex-orchestrator.ts`.
2. Determine whether any truthful local mixed-ownership seam remains after `1283`.
3. Preserve the current `setup` command behavior; this lane is reassessment-only unless a narrower truthful seam is proven.
4. Record the freeze-or-go result explicitly with evidence.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the remaining local `setup` pocket is closed honestly as `freeze` or moved forward honestly as `go`
- `abort`: the current-tree evidence is ambiguous enough that no single truthful reassessment result can be recorded
