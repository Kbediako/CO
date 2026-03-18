---
id: 20260318-1292-coordinator-symphony-aligned-flow-cli-request-shell-extraction
title: Coordinator Symphony-Aligned Flow CLI Request Shell Extraction
status: done
owner: Codex
created: 2026-03-18
last_review: 2026-03-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-flow-cli-request-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-flow-cli-request-shell-extraction.md
related_tasks:
  - tasks/tasks-1292-coordinator-symphony-aligned-flow-cli-request-shell-extraction.md
review_notes:
  - 2026-03-18: Opened after `1291` confirmed that `handleFlow(...)` still owns a real binary-facing request-shaping seam above `orchestrator/src/cli/flowCliShell.ts`. The next truthful nearby move is a bounded request-shell extraction that leaves shared parse/help ownership in the binary and lower lifecycle ownership in `flowCliShell.ts`. Evidence: `out/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit/manual/20260318T003200Z-closeout/00-summary.md`, `out/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit/manual/20260318T003200Z-closeout/14-next-slice-note.md`, `docs/findings/1292-flow-cli-request-shell-extraction-deliberation.md`.
  - 2026-03-18: Closed after extracting `orchestrator/src/cli/flowCliRequestShell.ts`. `bin/codex-orchestrator.ts` now keeps only local parse/help ownership plus a thin handoff, while lower flow lifecycle ownership remains in `orchestrator/src/cli/flowCliShell.ts`. Evidence: `out/1292-coordinator-symphony-aligned-flow-cli-request-shell-extraction/manual/20260318T003200Z-closeout/00-summary.md`, `out/1292-coordinator-symphony-aligned-flow-cli-request-shell-extraction/manual/20260318T003200Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The remaining `flow` wrapper logic is still broader than thin parse/help glue.

## Requirements

1. Extract the bounded `flow` request shell.
2. Preserve current behavior and ownership boundaries.
3. Add focused parity for the extracted helper.
4. Avoid widening into lower `flow` internals or unrelated CLI families.
