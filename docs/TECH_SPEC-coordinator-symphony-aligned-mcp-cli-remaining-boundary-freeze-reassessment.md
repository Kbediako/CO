# TECH_SPEC: Coordinator Symphony-Aligned MCP CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining local MCP wrapper surface after `1253`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/mcpEnableCliShell.ts`
- `orchestrator/src/cli/mcp.ts`
- adjacent MCP task/docs artifacts only if needed to record the freeze-or-go decision

## Requirements

1. Reinspect the remaining local MCP pocket without widening into shared top-level parser/help helpers.
2. Record an explicit freeze result if only parse/help glue and wrapper-only `serve` adaptation remain.
3. Only open another implementation slice if reassessment finds a real bounded ownership split.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the post-`1253` MCP pocket is explicitly frozen or a single truthful follow-on seam is named
- `abort`: reassessment requires cross-command widening to say anything truthful
