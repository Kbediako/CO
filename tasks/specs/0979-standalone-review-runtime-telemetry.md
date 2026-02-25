---
id: 20260225-0979-standalone-review-runtime-telemetry
title: Standalone Review Runtime Bounding + Telemetry
relates_to: tasks/tasks-0979-standalone-review-runtime-telemetry.md
risk: medium
owners:
  - Codex
last_review: 2026-02-25
---

## Summary
- Objective: harden standalone review runtime behavior so forced runs remain high-signal and diagnosable.
- Scope: `scripts/run-review.ts`, `tests/run-review.spec.ts`, and review docs updates.
- Constraints: preserve non-interactive handoff semantics and delegation MCP default-on posture.

## Decision and Success Criteria
- Decision:
  - Default to bounded review guidance (prompt-level constraints against heavy full-suite commands).
  - Allow explicit heavy-command execution via env override.
  - Keep strict bounded enforcement opt-in only (`CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1`) so agent autonomy remains the default.
  - Persist timeout/failure telemetry summary artifact under the review artifact directory.
- Success criteria:
  - Forced review timeout cases include telemetry summary in stderr and artifact JSON.
  - Existing run-review regression tests continue to pass.
  - New tests cover bounded prompt defaults + override + timeout telemetry summary.

## Technical Requirements
- Functional requirements:
  - Inject bounded-review prompt section by default.
  - Add env control to allow heavy commands (`CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`).
  - Add env control to enforce bounded mode (`CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1`) when operators explicitly want hard-stop behavior.
  - Parse review output log and summarize command activity/heavy-command indicators.
  - Write telemetry JSON artifact for review attempts and print concise diagnostics on timeout.
- Non-functional requirements (performance, reliability, security):
  - Log parsing must be bounded and resilient to malformed output.
  - No secrets should be emitted in telemetry summaries.
  - Maintain compatibility with current artifact paths and non-interactive usage.
- Interfaces / contracts:
  - New optional review telemetry artifact: `<runDir>/review/telemetry.json`.
  - Existing `prompt.txt` and `output.log` contracts remain unchanged.

## Architecture & Data
- Architecture / design adjustments:
  - Extend prompt construction with optional bounded guidance section.
  - Add output-log summarization helper and telemetry writer in run-review wrapper.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - None.

## Validation Plan
- Tests / checks:
  - `npm run test -- run-review`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Rollout verification:
  - Reproduce a forced review timeout with bounded telemetry enabled and verify summary lines + artifact.
- Monitoring / alerts:
  - Use wrapper stderr summary + telemetry artifact path for post-failure triage.

## Open Questions
- Should telemetry include per-command elapsed time in a future slice (requires richer parser state)?

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-25
