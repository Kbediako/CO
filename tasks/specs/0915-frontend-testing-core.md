---
id: 20251229-frontend-testing-core
title: Frontend Testing Core Capability
relates_to: docs/PRD-frontend-testing-core.md
risk: medium
owners:
  - Unassigned
last_review: 2025-12-29
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Define a first-class frontend testing surface with explicit DevTools enablement rules (off by default, on only for explicit frontend testing runs).
- Constraints:
  - DevTools MCP/skills remain external and optional.
  - No stdout protocol pollution; logs to stderr.
  - No writes to `node_modules`.

## Proposed Changes
- Architecture / design adjustments:
  - Add `frontend-testing` and `frontend-testing-devtools` pipelines.
  - Move DevTools enablement logic into a runtime module compiled into `dist/**`.
  - Add `doctor` checks for DevTools readiness and install guidance.
- Data model updates:
  - No schema changes; record devtools enablement in run summary or stage metadata.
- External dependencies:
  - Codex CLI, DevTools MCP/skills, optional Playwright-class deps.

## Impact Assessment
- User impact:
  - Clear, documented frontend testing entrypoint with explicit devtools opt-in.
- Operational risk:
  - DevTools missing in some environments; requires clear fallback messaging.
- Security / privacy:
  - DevTools stays opt-in; no background network calls.

## Rollout Plan
- Prerequisites:
  - Docs-review manifest captured before implementation.
  - Approvals recorded in `tasks/index.json` gate metadata.
- Testing strategy:
  - Unit tests for default-off / explicit-on devtools behavior.
  - `doctor` output coverage for devtools readiness.
- Launch steps:
  - Update README/agent docs and run implementation gate.

## Open Questions
- Should we allow a non-devtools fallback when the devtools pipeline is invoked without the skill?

## Approvals
- Reviewer: approved (2025-12-29)
- Date: 2025-12-29
