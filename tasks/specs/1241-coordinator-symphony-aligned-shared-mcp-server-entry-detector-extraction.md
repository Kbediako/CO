---
id: 20260316-1241-coordinator-symphony-aligned-shared-mcp-server-entry-detector-extraction
title: Coordinator Symphony-Aligned Shared MCP Server Entry Detector Extraction
status: active
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-shared-mcp-server-entry-detector-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-shared-mcp-server-entry-detector-extraction.md
related_tasks:
  - tasks/tasks-1241-coordinator-symphony-aligned-shared-mcp-server-entry-detector-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1240` confirmed that the broader doctor family is mostly orchestration and narrowed the next truthful seam to the duplicated MCP server-entry detector shared by `doctor.ts` and `delegationSetup.ts`. Evidence: `docs/findings/1241-shared-mcp-server-entry-detector-extraction-deliberation.md`, `out/1240-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment/manual/20260316T111040Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

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
