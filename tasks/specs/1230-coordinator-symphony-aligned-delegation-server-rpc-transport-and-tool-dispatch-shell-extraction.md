---
id: 20260316-1230-coordinator-symphony-aligned-delegation-server-rpc-transport-and-tool-dispatch-shell-extraction
title: Coordinator Symphony-Aligned Delegation Server RPC Transport and Tool-Dispatch Shell Extraction
status: active
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-delegation-server-rpc-transport-and-tool-dispatch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-server-rpc-transport-and-tool-dispatch-shell-extraction.md
related_tasks:
  - tasks/tasks-1230-coordinator-symphony-aligned-delegation-server-rpc-transport-and-tool-dispatch-shell-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1228` froze the standalone-review wrapper subsystem and bounded scouts plus local inspection identified `delegationServer.ts` as the next truthful mixed-ownership seam. Evidence: `docs/findings/1230-delegation-server-rpc-transport-and-tool-dispatch-shell-extraction-deliberation.md`, `out/1228-coordinator-symphony-aligned-standalone-review-remaining-wrapper-surface-freeze-reassessment/manual/20260316T054631Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

`delegationServer.ts` still owns the delegation-server runtime entry shell above the underlying handlers.

## Requirements

1. Extract the RPC transport/runtime shell.
2. Extract the tool-dispatch entry validation/routing shell.
3. Preserve current JSON-RPC transport compatibility and tool behavior.
4. Keep individual tool handlers and policy helpers out of scope for this lane unless a tiny parity helper is strictly required.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
