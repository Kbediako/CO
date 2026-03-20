---
id: 20260320-1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment
title: Coordinator Symphony Full-Parity Audit and Closure Truthfulness Reassessment
status: in_progress
owner: Codex
created: 2026-03-20
last_review: 2026-03-20
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md
related_tasks:
  - tasks/tasks-1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md
review_notes:
  - 2026-03-20: Opened after a fresh upstream parity audit showed that prior provider-intake follow-up lanes did not prove truthful full Symphony parity. The current tree still has larger architectural divergences around per-issue workspaces, repeated worker-turn continuation, and mid-run reconciliation, plus bounded patchable bugs in provider-intake success handling and selected-run summary freshness.
---

# Technical Specification

## Context

The repo needs a truthful parity rebaseline, not another narrow live-failure follow-up disguised as full closure.

## Requirements

1. Register a full parity matrix against the current Symphony SPEC plus current Elixir reference behavior.
2. State clearly which surfaces are aligned, which are intentionally divergent but acceptable, which are real gaps, and which remain environment-dependent.
3. Implement the bounded current-tree fixes:
   - fresh accepted active-issue events are not hard-blocked only because the previous child run succeeded
   - selected-run/status rendering does not surface stale failure summaries once the child manifest is succeeded
4. Preserve the live provider setup and validate against the existing control-host lane.
5. Keep larger architecture-level gaps explicit instead of overstating closure.

## Current Truth

- Aligned: provider intake host persistence, manifest-carried provider issue identity, core read-only observability API contract, and orchestrator read-side tracker authority.
- Larger gaps: per-issue workspaces, true repeated-turn continuation, and running-issue reconcile/stop behavior.
- Partial or environment-dependent: worker-visible Linear write tooling, richer issue-eligibility policy, and issue/workspace-turn UI richness.

## Validation Plan

- docs-review or explicit waiver
- targeted provider-intake and observability tests
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke` when required by touched downstream-facing surfaces
