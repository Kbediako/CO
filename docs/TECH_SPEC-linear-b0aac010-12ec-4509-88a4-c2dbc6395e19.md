---
id: 20260411-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19
title: CO: Audit remaining review-launch and compatibility alias seams after CO-88
relates_to: docs/PRD-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`
- PRD: `docs/PRD-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`
- Task checklist: `tasks/tasks-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`

## Summary
- Objective: decide which remaining CO-88 follow-up seams stay, which can be collapsed now, and what truthfulness updates are needed to make the retained seams explicit.
- Scope:
  - `scripts/lib/review-launch-attempt.ts` and the fallback/retry path exercised by `scripts/run-review.ts`
  - legacy collab env aliases in `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - the `requiresCloud` / `requires_cloud` compatibility family
  - optional cloud-sync seams under `orchestrator/src/sync/**`
- Constraints:
  - no repo-wide cleanup replay
  - no new runtime or cloud-sync features
  - docs-review before implementation

## Boundary
- Parent-owned audit surfaces:
  - docs packet and task mirrors
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - `orchestrator/src/sync/**`
  - `docs/README.md`
- Child-lane-owned audit surface:
  - `orchestrator/src/types.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionModePolicy.ts`
  - `orchestrator/src/manager.ts`
  - `orchestrator/tests/ExecutionModeResolution.test.ts`

## Design
- Keep behavior-heavy seams unless current-source evidence proves they can be narrowed safely.
- Prefer short code comments or doc wording tweaks over broad structural churn for retained seams.
- Record current-consumer evidence in the packet and workpad for every audited surface.

## Validation
- Run audited `linear child-stream --pipeline docs-review`.
- Integrate at least one audited same-issue child-lane result for the `requiresCloud` family.
- Run focused tests for review wrapper, collab runtime, cloud sync, and any touched execution-mode policy files.
- Run the repo validation floor, then standalone review plus elegance review before handoff.
