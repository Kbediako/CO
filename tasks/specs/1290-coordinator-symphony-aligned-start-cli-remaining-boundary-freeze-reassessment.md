---
id: 20260318-1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment
title: Coordinator Symphony-Aligned Start CLI Remaining Boundary Freeze Reassessment
status: done
owner: Codex
created: 2026-03-18
last_review: 2026-03-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md
related_tasks:
  - tasks/tasks-1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md
review_notes:
  - 2026-03-18: Opened after `1289` extracted `orchestrator/src/cli/startCliRequestShell.ts`. Current-tree inspection suggests the remaining local `start` pocket may now be only shared `parseArgs(...)` ownership, top-level help routing, and a thin wrapper into the extracted request-shell helper, so the next truthful nearby move is a freeze reassessment rather than an assumed follow-on extraction. Evidence: `out/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction/manual/20260317T150552Z-closeout/00-summary.md`, `out/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction/manual/20260317T150552Z-closeout/14-next-slice-note.md`, `docs/findings/1290-start-cli-remaining-boundary-freeze-reassessment-deliberation.md`.
  - 2026-03-18: Closed as a truthful no-op freeze. Post-`1289`, `handleStart(...)` in `bin/codex-orchestrator.ts` now keeps only shared `parseArgs(...)`, local help routing, and a thin handoff into `orchestrator/src/cli/startCliRequestShell.ts`, while lower lifecycle ownership stays in `orchestrator/src/cli/startCliShell.ts`, so no real local mixed-ownership start seam remains. Evidence: `out/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment/manual/20260317T151030Z-closeout/00-summary.md`, `out/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment/manual/20260317T151030Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The local `start` shell may now be exhausted after `1289`.

## Requirements

1. Reinspect the remaining local `start` ownership after `1289`.
2. Record a truthful freeze-or-go result.
3. Preserve current `start` behavior; this lane is reassessment-only unless a narrower truthful seam is proven.
4. Avoid widening into lower `start` execution behavior or unrelated CLI families.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
