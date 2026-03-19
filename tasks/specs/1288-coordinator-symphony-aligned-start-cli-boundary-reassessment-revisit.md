---
id: 20260317-1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit
title: Coordinator Symphony-Aligned Start CLI Boundary Reassessment Revisit
status: done
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md
related_tasks:
  - tasks/tasks-1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit.md
review_notes:
  - 2026-03-17: Opened after `1287` froze the remaining local `doctor` pocket. Current-tree inspection shows that `handleStart(...)` still owns broader binary-facing request shaping and policy injection above `orchestrator/src/cli/startCliShell.ts` than a thin parse-and-delegate wrapper, so the next truthful nearby move is to reassess the `start` boundary from current code rather than assume the pocket is exhausted. Evidence: `out/1287-coordinator-symphony-aligned-doctor-cli-remaining-boundary-freeze-reassessment/manual/20260317T144725Z-closeout/00-summary.md`, `out/1287-coordinator-symphony-aligned-doctor-cli-remaining-boundary-freeze-reassessment/manual/20260317T144725Z-closeout/14-next-slice-note.md`, `docs/findings/1288-start-cli-boundary-reassessment-revisit-deliberation.md`.
  - 2026-03-18: Closed as a truthful `go` reassessment. Current-tree inspection confirmed that `handleStart(...)` still owns a real binary-facing request-shaping seam above `orchestrator/src/cli/startCliShell.ts`, including mode selection, repo-policy application, auto-issue-log toggling, target/task/goal shaping, UI wrapping, and helper injection, so the next truthful nearby move is a bounded start request-shell extraction. Evidence: `out/1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit/manual/20260318T001200Z-closeout/00-summary.md`, `out/1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit/manual/20260318T001200Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The binary-facing `start` wrapper may still be broader than the older local freeze posture implied.

## Requirements

1. Reinspect the current `start` wrapper ownership.
2. Record a truthful freeze-or-go result.
3. Preserve current `start` behavior; this lane is reassessment-only unless a narrower truthful seam is proven.
4. Avoid widening into lower pipeline internals or unrelated CLI families.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
