# TECH_SPEC: Coordinator Symphony-Aligned Self-Check CLI Remaining Boundary Freeze Reassessment

## Scope

Truthful reassessment of the remaining local `self-check` wrapper surface after the `1281` shell extraction.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/selfCheckCliShell.ts`
- `orchestrator/src/cli/selfCheck.ts`
- focused self-check CLI tests as read-only evidence when needed

## Requirements

1. Reinspect the reduced `handleSelfCheck(...)` wrapper after `1281`.
2. Confirm whether any remaining mixed-ownership seam still exists locally.
3. Record an explicit `freeze` result when the residual surface is only same-owner parse/wrapper glue.
4. Do not start another implementation slice unless reassessment finds a real bounded seam.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the remaining local `self-check` pocket is explicitly frozen or one truthful bounded follow-on seam is identified
- `abort`: reassessment evidence is ambiguous and no single verified result can be stated
