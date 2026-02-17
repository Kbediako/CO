---
id: 20260217-0970-control-plane-guardrail-runner-hardening
title: Control-Plane + Guardrail Runner Hardening
relates_to: tasks/tasks-0970-control-plane-guardrail-runner-hardening.md
risk: medium
owners:
  - Codex
last_review: 2026-02-17
---

## Summary
- Objective: remove false control-plane validation noise and improve guardrail runner/reporting reliability.
- Scope: request builder optional-field shaping, guard wrapper fallback wiring, guardrail summary skip classification, and associated tests.
- Constraints: keep strict/warn policy decisions from deliberation intact; no unrelated refactors.

## Technical Requirements
- Functional requirements:
  - `buildRunRequestV2` must not emit undefined optional task keys.
  - Guard wrappers must attempt repo-local then package-local scripts.
  - Delegation wrapper strict/warn profile behavior must remain unchanged when no script is found.
  - Guardrail summary counts must reflect explicit skip signals, not only command status.
- Non-functional requirements:
  - Keep behavior backwards-compatible for existing pipeline contracts.
  - Keep changes minimal and reviewable.
- Interfaces / contracts:
  - No breaking CLI command surface changes.

## Validation Plan
- Tests / checks: delegation/spec guard, build, lint, test, docs checks, diff-budget, review.
- Regression checks:
  - request payload omits undefined optional task fields.
  - wrapper fallback path is deterministic and test-covered.
  - summary text for skipped spec guard is accurate.

## Open Questions
- None blocking.

## Approvals
- Reviewer: user
- Date: 2026-02-17
