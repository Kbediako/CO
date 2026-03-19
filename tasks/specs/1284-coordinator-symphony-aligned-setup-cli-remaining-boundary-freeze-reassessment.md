---
id: 20260317-1284-coordinator-symphony-aligned-setup-cli-remaining-boundary-freeze-reassessment
title: Coordinator Symphony-Aligned Setup CLI Remaining Boundary Freeze Reassessment
status: done
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-setup-cli-remaining-boundary-freeze-reassessment.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-setup-cli-remaining-boundary-freeze-reassessment.md
related_tasks:
  - tasks/tasks-1284-coordinator-symphony-aligned-setup-cli-remaining-boundary-freeze-reassessment.md
review_notes:
  - 2026-03-17: Opened after `1283` extracted `orchestrator/src/cli/setupCliShell.ts`. Current-tree inspection suggests the remaining local `setup` pocket may now be only shared `parseArgs(...)` ownership, top-level command dispatch, top-level help routing, and a thin wrapper into the extracted shell helper, so the next truthful nearby move is a freeze reassessment rather than an assumed follow-on extraction. Evidence: `out/1283-coordinator-symphony-aligned-setup-cli-wrapper-extraction/manual/20260317T140307Z-closeout/00-summary.md`, `out/1283-coordinator-symphony-aligned-setup-cli-wrapper-extraction/manual/20260317T140307Z-closeout/14-next-slice-note.md`, `docs/findings/1284-setup-cli-remaining-boundary-freeze-reassessment-deliberation.md`.
  - 2026-03-17: Closed as a truthful no-op freeze. After `1283`, `handleSetup(...)` only retains shared `parseArgs(...)` ownership, top-level help routing, and a thin wrapper into `orchestrator/src/cli/setupCliShell.ts`; no real local mixed-ownership seam remains there. The next truthful nearby move is `1285`, a doctor CLI boundary reassessment revisit from current code. Evidence: `out/1284-coordinator-symphony-aligned-setup-cli-remaining-boundary-freeze-reassessment/manual/20260317T142121Z-closeout/00-summary.md`, `out/1284-coordinator-symphony-aligned-setup-cli-remaining-boundary-freeze-reassessment/manual/20260317T142121Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The local `setup` shell may now be exhausted after `1283`.

## Requirements

1. Reinspect the remaining local `setup` ownership after `1283`.
2. Record a truthful freeze-or-go result.
3. Preserve the current `setup` command behavior; this lane is reassessment-only unless a narrower truthful seam is proven.
4. Avoid widening into lower setup bootstrap behavior or unrelated CLI families.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
