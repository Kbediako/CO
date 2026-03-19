# TECH_SPEC: Coordinator Symphony-Aligned Flow CLI Remaining Boundary Freeze Reassessment Revisit

## Overview

This lane is a docs-first reassessment of the remaining local `flow` wrapper ownership after `1292`.

## Scope

- reinspect the current `handleFlow(...)` ownership in `bin/codex-orchestrator.ts`
- classify the remaining local `flow` pocket as truthful `freeze` or truthful `go`
- record the next nearby lane only if current code proves another bounded seam

## Out of Scope

- code changes to lower `flow` execution behavior
- changes to `orchestrator/src/cli/flowCliRequestShell.ts` or `orchestrator/src/cli/flowCliShell.ts` unless a reassessment proves they are necessary in a later lane
- widening into unrelated CLI families

## Validation

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
