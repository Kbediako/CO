# TECH_SPEC: Coordinator Symphony-Aligned Shared MCP Server Entry Detector Extraction

## Context

`1240` narrowed the remaining doctor-family work to a concrete micro-seam: the duplicated `hasMcpServerEntry(...)` parser stack used by doctor delegation readiness and delegation setup fallback.

## Requirements

1. Extract the shared MCP server-entry detector from the duplicated logic in:
   - `orchestrator/src/cli/doctor.ts`
   - `orchestrator/src/cli/delegationSetup.ts`
2. Place the shared helper in the smallest truthful utility location for CLI-side TOML MCP-entry detection.
3. Preserve current behavior for:
   - `[mcp_servers.<name>]` tables
   - quoted table names
   - dotted entry syntax under `mcp_servers`
   - inline comments and blank lines
4. Keep doctor delegation readiness and delegation setup fallback outputs unchanged.
5. Add focused regression coverage for the shared helper and both consuming call sites.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused tests for the shared detector plus doctor/delegation setup call sites
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`

## Exit Conditions

- `go`: duplicated MCP server-entry detection is removed from doctor and delegation setup, both use one shared helper, and focused regressions prove parity
- `no-go`: local evidence shows the duplication is not actually the same contract or the helper would force a misleading abstraction
