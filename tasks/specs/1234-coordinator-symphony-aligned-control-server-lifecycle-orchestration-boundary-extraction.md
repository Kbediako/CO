---
id: 20260316-1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction
title: Coordinator Symphony-Aligned Control Server Lifecycle Orchestration Boundary Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md
related_tasks:
  - tasks/tasks-1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1233` froze the control request/action dispatch family and bounded scout evidence identified the control-server lifecycle host-runtime layer as the next truthful broader seam. Evidence: `docs/findings/1234-control-server-lifecycle-orchestration-boundary-extraction-deliberation.md`, `out/1233-coordinator-symphony-aligned-control-request-and-action-dispatch-boundary-reassessment/manual/20260316T074123Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Closed after extracting `controlServerOwnedRuntimeLifecycle.ts` as the stateful owned-runtime publication and shutdown boundary. Focused lifecycle regressions, build, lint, docs gates, and pack smoke passed. Explicit carry-forwards are the collab-subagent delegation-guard override, the stacked-branch diff-budget waiver, the recurring full-suite quiet-tail after the final visible `tests/cli-orchestrator.spec.ts` pass, and bounded review drift into stale `1231` guard provenance. Evidence: `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/00-summary.md`, `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/13-override-notes.md`, `out/1234-coordinator-symphony-aligned-control-server-lifecycle-orchestration-boundary-extraction/manual/20260316T075807Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The control-server host-runtime layer used to coordinate startup, readiness, bootstrap publication, and shutdown across several adjacent lifecycle files.

## Requirements

1. Reinspect the control-server lifecycle orchestration boundary.
2. Extract the smallest truthful lifecycle seam that still owns startup/close sequencing.
3. Preserve readiness, bind ordering, persisted auth metadata timing, and teardown behavior.
4. Keep request/action dispatch, Telegram, Linear, oversight, and bootstrap policy families out of scope unless a tiny parity helper is strictly required.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Outcome

`1234` is complete. The shipped seam is `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`, with `controlServerReadyInstanceLifecycle.ts` reduced to startup orchestration over the extracted state publication + close boundary.
