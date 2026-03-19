# TECH_SPEC: Coordinator Symphony-Aligned Flow CLI Boundary Reassessment Revisit

## Context

The earlier `1247` lane extracted `orchestrator/src/cli/flowCliShell.ts`, but the current `handleFlow(...)` wrapper still owns substantial binary-facing request shaping above that shell.

## Requirements

1. Reinspect the current `flow` wrapper ownership in `bin/codex-orchestrator.ts`.
2. Record a truthful `freeze` or `go` result from current evidence.
3. Preserve current `flow` behavior in this lane; no implementation work unless a narrower truthful seam is proven.
4. Avoid widening into lower pipeline internals or unrelated CLI families.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
