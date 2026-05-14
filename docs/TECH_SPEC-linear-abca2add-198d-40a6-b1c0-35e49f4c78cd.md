---
id: 20260413-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd
title: CO: narrow generic control-host forced cleanup to avoid detached provider-worker collateral
relates_to: docs/PRD-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md
risk: high
owners:
  - Codex
last_review: 2026-04-13
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`
- PRD: `docs/PRD-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`
- Task checklist: `tasks/tasks-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`

## Traceability
- Linear issue: `CO-164` / `abca2add-198d-40a6-b1c0-35e49f4c78cd`
- Linear URL: https://linear.app/asabeko/issue/CO-164/co-narrow-generic-control-host-forced-cleanup-to-avoid-detached

## Summary
- Objective: narrow the generic control-host supervision teardown helper so stale-host forced cleanup remains process-group-scoped and does not kill detached provider workers that still appear as descendants temporarily.
- Scope:
  - docs-first registration for `CO-164`
  - one bounded implementation seam in `terminateChildProcess(...)`
  - focused regression coverage for generic cleanup behavior
  - preservation of process-group and descendant diagnostics
- Constraints:
  - do not change `CO-163` restart-specific cleanup semantics
  - do not weaken stale control-host teardown
  - do not widen into provider workflow or timeout tuning

## Issue-Shaping Contract
- User-request translation carried forward: the generic forced-cleanup path must stop killing detached provider workers as collateral, but stale control-host teardown must remain reliable and diagnostic.
- Protected terms / exact artifact and surface names: `generic control-host forced cleanup`, `detached provider-linear-worker collateral`, `process-group-scoped teardown`, `descendant diagnostics`, `terminateChildProcess(...)`.
- Nearby wrong interpretations to reject: changing the `CO-163` restart path again, weakening stale-host teardown, or tuning timeouts instead of narrowing the kill target.
- Explicit non-goals carried forward: duplicate-host evidence redesign, provider review/merge behavior, and timeout-only mitigation.

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth: restart-specific cleanup is already process-group-scoped, but generic wrapper cleanup still escalates to descendant `SIGKILL`s.
- Reference truth: both cleanup paths kill only the stale control-host process group and retain descendant inspection as diagnostics.
- Target truth / intended delta: `terminateChildProcess(...)` kills only the stale process group, leaves descendants diagnostic-only, and proves that contract in focused tests.
- Explicitly out-of-scope differences: restart-specific payload changes, duplicate-owner artifacts, and workflow-state logic.

## Readiness Gate
- Not done if:
  - generic forced cleanup still kills detached provider workers
  - stale control-host teardown no longer reaches a terminal stopped state
  - descendant/process-group diagnostics disappear
  - focused regression coverage is missing
- Pre-implementation issue-quality review evidence:
  - 2026-04-13: parent worker verified the issue is narrower than `CO-163`; the only live seam is the generic wrapper cleanup helper `terminateChildProcess(...)`, which still kills descendants after process-group escalation.
- Safeguard ownership split:
  - same-issue child lanes stay serial this turn because the change is a single bounded teardown seam plus tightly coupled docs/tests.

## Technical Requirements
- Functional requirements:
  - generic forced cleanup must continue issuing `SIGTERM` first, then kill only the stale control-host process group on timeout
  - descendant inspection must remain available for diagnostics, not as an additional kill target
  - generic cleanup must still stop the supervised child wrapper reliably and fail closed if the stale process group survives
  - focused tests must prove detached provider-worker descendants are preserved
- Non-functional requirements:
  - no additional broad refactor of supervision lifecycle
  - behavior remains deterministic in the current Vitest fixture coverage
  - restart-specific cleanup remains unchanged
- Interfaces / contracts:
  - `terminateChildProcess(...)` in `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
  - focused `ControlHostSupervision.test.ts` cases for timeout escalation behavior

## Architecture & Data
- Architecture / design adjustments:
  - remove descendant `SIGKILL` escalation from the generic teardown helper after process-group cleanup
  - keep any descendant enumeration purely diagnostic for tests and future observability
  - preserve the existing wrapper `child.kill('SIGKILL')` fallback for the supervisor child itself
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - `ps` process-group / descendant inspection helpers already in `controlHostSupervisionCliShell.ts`
  - current Vitest supervision fixtures

## Validation Plan
- Tests / checks:
  - focused `ControlHostSupervision.test.ts` coverage around timeout cleanup and detached descendants
  - standard repo validation floor before review handoff
- Rollout verification:
  - timeout cleanup still kills the stale process group
  - descendant kill calls are absent while diagnostics remain available
  - detached worker preservation is explicit in test assertions
- Monitoring / alerts:
  - existing supervision diagnostics remain the operator surface; no new alerting introduced

## Open Questions
- Whether generic timeout cleanup should surface descendant diagnostics in a future structured payload. This lane does not require a new payload as long as diagnostics remain inspectable in-code and in tests.

## Approvals
- Reviewer: pending docs-review evidence for the CO-164 packet
- Date: 2026-04-13
