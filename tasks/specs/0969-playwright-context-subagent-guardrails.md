---
id: 20260217-0969-playwright-context-subagent-guardrails
title: Playwright Context Control + Subagent Guardrails
relates_to: tasks/tasks-0969-playwright-context-subagent-guardrails.md
risk: medium
owners:
  - Codex
last_review: 2026-02-17
---

## Summary
- Objective: prevent parent-context blowups from browser automation output while preserving agent-first autonomy.
- Scope: shipped docs/skills policy updates plus local global skill updates for Playwright wrapper compatibility and bounded output behavior.
- Constraints: no behavior-breaking CLI API changes; keep guidance minimal and easy for downstream agents.

## Technical Requirements
- Functional requirements:
  - Standardize policy: Playwright-heavy actions run in dedicated subagents and return concise summaries + artifact paths only.
  - Keep MCP default posture explicit: enable Playwright MCP only when relevant.
  - Fix local Playwright wrapper to use the current MCP package executable.
  - Update frontend testing/design-review skill guidance to avoid raw high-volume dump into parent context.
- Non-functional requirements:
  - Keep docs/skill changes concise and low-friction.
  - Preserve existing delegation lifecycle requirements.
- Interfaces / contracts:
  - No breaking command surface changes in shipped CLI.

## Validation Plan
- Tests / checks: delegation/spec guard, build, lint, test, docs checks, diff-budget, review.
- Regression checks: ensure docs and skill references remain valid and no stale command examples.
- Manual checks:
  - Reproduce prior wrapper failure.
  - Confirm updated wrapper executes and produces expected output.
  - Confirm documented low-noise workflow pattern is actionable.

## Open Questions
- None blocking.

## Approvals
- Reviewer: user
- Date: 2026-02-17
