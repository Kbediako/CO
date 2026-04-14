---
id: 20260414-linear-0f7f6994-db41-4b0a-91f3-9b8f32ea427c
title: CO: harden forced standalone review so boundary fallbacks do not replace review verdicts
status: in_progress
owner: Codex
created: 2026-04-14
last_review: 2026-04-14
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-0f7f6994-db41-4b0a-91f3-9b8f32ea427c.md
related_action_plan: docs/ACTION_PLAN-linear-0f7f6994-db41-4b0a-91f3-9b8f32ea427c.md
related_tasks:
  - tasks/tasks-linear-0f7f6994-db41-4b0a-91f3-9b8f32ea427c.md
---

# Technical Specification Mirror

Canonical task spec: `tasks/specs/linear-0f7f6994-db41-4b0a-91f3-9b8f32ea427c.md`.

## Summary
- Objective: forced standalone review returns `clean-success` or `bounded-success` instead of routine manual fallback after validation-command attempts.
- Scope: scoped launch constraints, command-intent retry, telemetry/workpad interpretation, focused tests, and `docs/standalone-review-guide.md`.
- Constraints: keep `command-intent`, `failed-boundary`, `bounded-success`, and `clean-success` truthful; do not permit validation suites.

## Issue-Shaping Contract
- Preserve: `FORCE_CODEX_REVIEW=1`, `codex-orchestrator review`, `npm run review`, `validation-suite`, `validation-runner`, `prompt_delivery=artifact-only`, `reviewer_visible_context_transport=scoped-title`.
- Reject: validation execution, hidden boundary telemetry, CO-102 freshness conflation, and manual-fallback-as-policy.
- Validate: docs-review, focused wrapper tests, and repro forced review runs for scoped modes.
