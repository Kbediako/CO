# ACTION_PLAN - CO-354 multi_agent_v2 thread-limit safe defaults

## Summary
- Goal: make CO defaults, init, and doctor safe for `features.multi_agent_v2=true` without regressing normal `features.multi_agent=true` users.
- Scope: docs-first packet, doctor/default/init implementation, targeted tests, bounded docs/template wording, validation, PR handoff.
- Assumptions:
  - `multi_agent_v2` is experimental/off by default.
  - missing `multi_agent_v2` in feature output and config means older/stable Codex behavior.
  - only explicit enabled/true `multi_agent_v2` should suppress `agents.max_threads`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `Codex CLI 0.125.0`, `features.multi_agent_v2=true`, `agents.max_threads`, `features.multi_agent=true`, `doctor/default setup`.
- Not done if: invalid config can still be written under `multi_agent_v2`, including by repo init, or normal `multi_agent` loses the seeded baseline.
- Pre-implementation issue-quality review: source scan located the bounded implementation/test/docs surfaces; child-lane docs ownership is separated from parent implementation and tests.

## Milestones & Sequencing
1. Create docs-first packet, task registry entry, checklist mirrors, and workpad evidence.
2. Complete/accept bounded docs-template child lane or manually reconcile if the helper invalidates a completed patch for Linear drift.
3. Implement shared `multi_agent_v2` feature detection in default setup, init, and doctor checks.
4. Add targeted stable, experimental, feature-list-only, nonnumeric-present, and older-Codex tests.
5. Run targeted validation, full guard lane, standalone review, elegance pass, PR attachment, and ready-review drain.

## Dependencies
- Shared Codex feature-list parsing.
- Existing TOML config read/write helpers.
- Linear workpad and child-lane helper surfaces.

## Validation
- Checks / tests:
  - targeted Vitest for `orchestrator/tests/CodexDefaultsSetup.test.ts`
  - targeted Vitest for `orchestrator/tests/Doctor.test.ts`
  - targeted Vitest for `orchestrator/tests/InitTemplates.test.ts`
  - repo guard commands listed in the canonical spec
  - manifest-backed review and elegance pass
- Rollback plan:
  - revert the small doctor/default/test/docs diff; stable `multi_agent` baseline remains the fallback behavior.

## Risks & Mitigations
- Risk: feature-list parsing misclassifies older Codex as `multi_agent_v2`.
  - Mitigation: only explicit enabled/true `multi_agent_v2` suppresses `max_threads`.
- Risk: repo init static template remains valid for normal users but invalid for v2 users.
  - Mitigation: keep the static normal baseline and strip only the copied key when v2 is active.
- Risk: docs child-lane patch overlaps parent work.
  - Mitigation: parent avoids delegated docs/template files until accept/reject.
- Risk: doctor result schema changes affect consumers.
  - Mitigation: keep status string additive and tests focused on formatted summary and JSON fields.

## Approvals
- Reviewer: manifest-backed standalone review
- Date: 2026-04-25
- Result: bounded-success via command-intent retry, with no actionable diff-local regressions reported.
