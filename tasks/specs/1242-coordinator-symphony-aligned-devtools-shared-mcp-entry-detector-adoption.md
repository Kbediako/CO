---
id: 20260316-1242-coordinator-symphony-aligned-devtools-shared-mcp-entry-detector-adoption
title: Coordinator Symphony-Aligned Devtools Shared MCP Entry Detector Adoption
status: active
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-devtools-shared-mcp-entry-detector-adoption.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-devtools-shared-mcp-entry-detector-adoption.md
related_tasks:
  - tasks/tasks-1242-coordinator-symphony-aligned-devtools-shared-mcp-entry-detector-adoption.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1241` established the shared MCP server-entry detector and bounded scout evidence identified `devtools.ts` as the next truthful adoption seam. Evidence: `docs/findings/1242-devtools-shared-mcp-entry-detector-adoption-deliberation.md`, `out/1241-coordinator-symphony-aligned-shared-mcp-server-entry-detector-extraction/manual/20260316T112401Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

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
