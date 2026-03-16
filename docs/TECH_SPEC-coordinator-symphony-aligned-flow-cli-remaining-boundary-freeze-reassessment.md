# TECH_SPEC: Coordinator Symphony-Aligned Flow CLI Remaining Boundary Freeze Reassessment

## Scope

Read-only reassessment of the remaining flow-adjacent surface after `1247`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/flowCliShell.ts`
- `tests/cli-command-surface.spec.ts`
- `orchestrator/tests/FlowCliShell.test.ts`

## Requirements

1. Reinspect the remaining flow-related surface after `1247`.
2. Distinguish real remaining ownership overlap from parser/help glue or shared helpers.
3. If no bounded seam remains, record an explicit freeze result.
4. If a bounded seam does remain, name it precisely without widening scope.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the remaining flow pocket is explicitly frozen or a single truthful follow-on seam is named
- `abort`: reassessment requires broadening into a cross-command shared-helper family
