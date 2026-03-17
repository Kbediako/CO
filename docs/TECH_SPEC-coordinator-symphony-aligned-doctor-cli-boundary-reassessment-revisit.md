# TECH_SPEC: Coordinator Symphony-Aligned Doctor CLI Boundary Reassessment Revisit

## Scope

Bounded reassessment of the local `doctor` pocket in `bin/codex-orchestrator.ts` after current-tree inspection showed materially broader wrapper-local ownership than the older freeze note claimed.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/doctorCliShell.ts`
- docs/task mirrors for the reassessment result

## Requirements

1. Reinspect the current local `doctor` ownership in `bin/codex-orchestrator.ts`.
2. Compare that ownership against the existing `doctorCliShell` split.
3. Record a truthful `go` or `freeze` result from current evidence.
4. Preserve current `doctor` behavior; this lane is reassessment-only unless a narrower truthful seam is proven.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the local `doctor` boundary is truthfully reclassified as `go` or `freeze`
- `abort`: the current-tree evidence is too ambiguous to support a single honest reassessment result
