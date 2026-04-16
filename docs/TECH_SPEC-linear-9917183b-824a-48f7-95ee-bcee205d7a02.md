---
id: 20260416-linear-9917183b-824a-48f7-95ee-bcee205d7a02
title: CO STATUS: do not project invalidated child-lane failure summaries as current progress
relates_to: docs/PRD-linear-9917183b-824a-48f7-95ee-bcee205d7a02.md
risk: medium
owners:
  - Codex
last_review: 2026-04-16
---

This mirror points to the canonical TECH_SPEC at `tasks/specs/linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`.

## Summary
- Objective: prevent parent disposition timestamps from making stale disposed child-lane summaries win `CO STATUS` current-progress ranking.
- Scope: `deriveProviderLinearWorkerProgressSnapshot(...)`, child-lane progress summary candidate helpers, and focused provider issue observability regressions.
- Protected surfaces: `CO STATUS`, `co-status --format json`, `provider-linear-worker-progress`, `child_lane_summary`, `provider-linear-worker-child-lanes.json`, `provider-linear-worker-proof.json`, `decision_at`, `decision=invalidated`, `launched_at`, replacement child lane.

## Technical Requirements
- Disposed child lanes with `decision` equal to `accepted`, `rejected`, or `invalidated` must not contribute active `child_lane_summary` progress candidates.
- Child-lane summary candidate freshness must use child-lane output proxy timing, not parent `decision_at`.
- Pending or active child-lane summaries must remain visible.
- Historical child-lane proof records must remain intact.

## Validation Plan
- `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueObservability.test.ts`
- Required repo guard suite before handoff: delegation guard, spec guard, build, lint, test, docs gates, repo stewardship, diff budget, standalone review, and elegance pass.
