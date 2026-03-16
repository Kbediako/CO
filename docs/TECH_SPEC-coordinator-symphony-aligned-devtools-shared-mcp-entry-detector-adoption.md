# TECH_SPEC: Coordinator Symphony-Aligned Devtools Shared MCP Entry Detector Adoption

## Context

`1241` introduced `orchestrator/src/cli/utils/mcpServerEntry.ts` as the shared owner for TOML MCP server-entry detection. `devtools.ts` still contains a specialized copy of that contract.

## Requirements

1. Rewire `orchestrator/src/cli/utils/devtools.ts` to use the shared MCP server-entry detector.
2. Remove the local specialized detector and its duplicate comment-parsing helpers from `devtools.ts`.
3. Preserve current devtools readiness behavior for:
   - direct server tables
   - quoted table names
   - dotted config entries
   - inline comments and blank lines
4. Add focused regression coverage for the devtools readiness surface that now depends on the shared helper.
5. Keep the lane bounded to devtools helper adoption; do not widen into doctor or delegation follow-on work.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused tests for devtools readiness parsing
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`

## Exit Conditions

- `go`: devtools readiness consumes the shared helper, duplicate parsing is removed, and focused regressions prove parity
- `no-go`: adopting the shared helper would break a devtools-specific contract that the current helper cannot truthfully own
