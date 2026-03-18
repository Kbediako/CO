# TECH_SPEC: Coordinator Symphony-Aligned RLM CLI Boundary Reassessment Revisit

## Scope

Read-only reassessment of the current local `rlm` wrapper ownership after the earlier RLM shell extractions and freeze.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/rlmLaunchCliShell.ts`
- `orchestrator/src/cli/rlmCompletionCliShell.ts`
- focused adjacent tests or docs only as needed to confirm ownership

## Requirements

1. Reinspect the current `handleRlm(...)` ownership from today’s tree.
2. Distinguish real remaining wrapper overlap from acceptable binary-local parse/help glue.
3. If no bounded seam remains, record an explicit freeze result.
4. If a bounded seam does remain, name it precisely without widening into deeper runtime internals.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
