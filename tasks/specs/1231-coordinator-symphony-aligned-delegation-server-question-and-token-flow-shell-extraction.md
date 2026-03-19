---
id: 20260316-1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction
title: Coordinator Symphony-Aligned Delegation Server Question and Token Flow Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md
related_tasks:
  - tasks/tasks-1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1230` closed the transport/tool-dispatch shell and bounded scout plus local inspection identified the question/delegation-token flow cluster as the next truthful seam in `delegationServer.ts`. Evidence: `docs/findings/1231-delegation-server-question-and-token-flow-shell-extraction-deliberation.md`, `out/1230-coordinator-symphony-aligned-delegation-server-rpc-transport-and-tool-dispatch-shell-extraction/manual/20260316T062527Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Closed after extracting the question/token flow shell into `orchestrator/src/cli/delegationServerQuestionFlowShell.ts`; focused delegation-server regressions, build, lint, full `npm run test` (`246/246` files, `1730/1730` tests), docs gates, bounded review, and pack-smoke passed. The explicit carry-forwards are limited to the repo-global stale-spec dry-run warnings, the stacked-branch diff-budget override, and the earlier docs-review guard stop. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/00-summary.md`, `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/13-override-notes.md`, `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

`delegationServer.ts` still owns the question enqueue/poll and delegation-token flow cluster after the `1230` transport/tool-dispatch extraction.

## Requirements

1. Extract the question enqueue/poll and delegation-token flow shell.
2. Preserve current question, token, await-state, and fallback behavior.
3. Keep transport/tool-dispatch helpers, spawn/status/cancel flows, dynamic-tool bridge behavior, and GitHub tool handling out of scope for this lane.
4. Keep the lane bounded to `delegationServer.ts` plus adjacent focused tests unless a tiny helper file is required for parity.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
