---
id: 20260216-0967-pr-watch-required-checks-review-artifacts
title: PR Watch Required-Checks Gate + Review Artifacts Guide
relates_to: tasks/tasks-0967-pr-watch-required-checks-review-artifacts.md
risk: medium
owners:
  - Codex
last_review: 2026-02-16
---

## Summary
- Objective: eliminate `pr watch-merge` friction from non-required pending checks while keeping bot-review value.
- Scope: required-check gating update + review-artifacts guide + docs/help links.
- Constraints: preserve existing safety gates and keep CodeRabbit enabled.

## Technical Requirements
- Functional requirements:
  - Gate check readiness on required checks when available.
  - Keep non-check blockers unchanged.
  - Add guide documenting review artifact paths and quick usage.
- Non-functional requirements (performance, reliability, security):
  - Polling remains non-interactive and robust to transient GH errors.
  - No secrets/credential handling changes.
- Interfaces / contracts:
  - Existing CLI command surface remains compatible.

## Validation Plan
- Tests / checks: build, lint, test, docs checks/freshness, diff-budget, review.
- Rollout verification: dry-run monitor behavior on live PR with optional pending bot check.
- Monitoring / alerts: existing PR monitor logs.

## Open Questions
- None blocking.

## Approvals
- Reviewer: user
- Date: 2026-02-16
