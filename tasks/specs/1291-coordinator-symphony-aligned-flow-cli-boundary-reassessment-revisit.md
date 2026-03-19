---
id: 20260318-1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit
title: Coordinator Symphony-Aligned Flow CLI Boundary Reassessment Revisit
status: done
owner: Codex
created: 2026-03-18
last_review: 2026-03-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md
related_tasks:
  - tasks/tasks-1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md
review_notes:
  - 2026-03-18: Opened after `1290` froze the remaining local `start` pocket. Current-tree inspection shows that `handleFlow(...)` still owns broader binary-facing request shaping and helper injection above `orchestrator/src/cli/flowCliShell.ts` than a thin parse-and-delegate wrapper, so the next truthful nearby move is to reassess the `flow` boundary from current code rather than assume the pocket is exhausted. Evidence: `out/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment/manual/20260317T151030Z-closeout/00-summary.md`, `out/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment/manual/20260317T151030Z-closeout/14-next-slice-note.md`, `docs/findings/1291-flow-cli-boundary-reassessment-revisit-deliberation.md`.
  - 2026-03-18: Closed as a truthful `go` reassessment. Current-tree inspection confirmed that `handleFlow(...)` still owns a real binary-facing request-shaping seam above `orchestrator/src/cli/flowCliShell.ts`, including mode selection, repo-policy application, auto-issue-log toggling, task/target/parent-run/approval-policy shaping, and UI/helper injection, so the next truthful nearby move is a bounded flow request-shell extraction. Evidence: `out/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit/manual/20260318T003200Z-closeout/00-summary.md`, `out/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit/manual/20260318T003200Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The binary-facing `flow` wrapper may still be broader than the older local freeze posture implied.

## Requirements

1. Reinspect the current `flow` wrapper ownership.
2. Record a truthful freeze-or-go result.
3. Preserve current `flow` behavior; this lane is reassessment-only unless a narrower truthful seam is proven.
4. Avoid widening into lower pipeline internals or unrelated CLI families.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
