---
id: 20260216-0968-downstream-usage-adoption-flow-guidance
title: Downstream Usage Adoption + Guardrail Flow + Setup Guidance
relates_to: tasks/tasks-0968-downstream-usage-adoption-flow-guidance.md
risk: medium
owners:
  - Codex
last_review: 2026-02-17
---

## Summary
- Objective: increase downstream adoption of guardrail pipelines and agent-first behavior with minimal CLI UX nudges.
- Scope: post-exec guidance, single-command docs->implementation flow, and setup-time policy/skills discoverability.
- Follow-up scope (2026-02-17): tighten scoped flow target matching and prevent premature PR auto-merge when actionable bot inline feedback is not yet acknowledged.
- Constraints: keep existing CLI compatibility and avoid blocking behavior.

## Technical Requirements
- Functional requirements:
  - Emit concise post-exec recommendation in text mode when adoption suggests underuse of gates.
  - Provide a flow command that runs `docs-review` then `implementation-gate`.
  - Scoped flow targets must match only items in the scoped pipeline while still accepting scoped aliases (for example, `implementation-gate:<alias>`).
  - Surface policy/skills setup guidance in setup summaries.
  - `pr watch-merge` auto-merge readiness must stay blocked when head-commit bot inline feedback has no human in-thread reply.
- Non-functional requirements (performance, reliability, security):
  - No significant startup/command latency regression.
  - Preserve JSON output stability for automation.
  - No secret/auth behavior changes.
- Interfaces / contracts:
  - Existing command surfaces remain compatible.
  - New command is additive and documented.

## Validation Plan
- Tests / checks: delegation/spec guard, build, lint, test, docs checks, diff-budget, review.
- Regression checks: `tests/cli-command-surface.spec.ts` and `tests/pr-watch-merge.spec.ts`.
- Rollout verification: manual smoke in local and one downstream repo (`tower-defence`) using shipped CLI.
- Monitoring / alerts: `doctor --usage` snapshots before/after for gate adoption trend.

## Open Questions
- None blocking.

## Approvals
- Reviewer: user
- Date: 2026-02-16
