---
id: 20260227-0983-runtime-default-flip-readiness-automation
title: Runtime Default Flip Readiness Automation
relates_to: tasks/tasks-0983-runtime-default-flip-readiness-automation.md
risk: high
owners:
  - Codex
last_review: 2026-02-27
---

## Summary
- Objective: add deterministic runtime canary automation for dummy repos and finalize an evidence-backed runtime default decision.
- Scope: canary script, start-command exit-code hardening for failed runs, policy updates, and optional default flip.
- Constraints: preserve compatibility and CLI break-glass behavior.

## Decision and Success Criteria
- Decision:
  - Use hybrid cadence for gate `10`: task-triggered required runs plus time-based backstop.
  - Use scripted dummy canaries as primary evidence to decide whether to flip default now.
- Success criteria:
  - Canary summary shows threshold compliance.
  - Failed start runs exit non-zero for automation reliability.
  - Default flip to appserver occurs only when thresholds pass.

## Technical Requirements
- Functional requirements:
  - Add script for multi-iteration dummy runtime canary matrix.
  - Validate appserver success/fallback/unsupported-combo semantics via manifest and exit codes.
  - Enforce non-zero exit for `start` when manifest status is failed/cancelled.
- Non-functional requirements:
  - Stable artifacts under `out/0983-runtime-default-flip-readiness-automation/manual/`.
  - No schema changes.

## Architecture & Data
- Architecture / design adjustments:
  - New automation script in `scripts/` and package script alias.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - npm pack/install and mock codex binary in temp repos.

## Validation Plan
- Runtime canary matrix run with thresholds and summary assertion.
- Ordered validation gates 1-10.

## Open Questions
- Whether to cut npm release immediately after merge or wait one post-merge soak cycle.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
