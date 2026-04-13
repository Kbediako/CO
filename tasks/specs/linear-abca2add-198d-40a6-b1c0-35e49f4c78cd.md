---
id: 20260413-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd
title: CO: narrow generic control-host forced cleanup to avoid detached provider-worker collateral
status: in_progress
owner: Codex
created: 2026-04-13
last_review: 2026-04-13
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md
related_action_plan: docs/ACTION_PLAN-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md
related_tasks:
  - tasks/tasks-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md
review_notes:
  - 2026-04-13: Resumed live `linear issue-context` recheck found `CO-164` back in `Ready` after the earlier blocked closeout, with no attached PR and existing persistent `## Codex Workpad` comment `0f3f8fa7-825c-4e74-a005-745c33992419`; the lane was moved back to `In Progress` after blocker `CO-165` reached `Done`.
  - 2026-04-13: Required same-turn parallelization was recorded as `stay_serial` / `single_bounded_change` because the lane is one bounded teardown seam in `controlHostSupervisionCliShell.ts` plus tightly coupled docs/tests.
  - 2026-04-13: Source audit confirmed the remaining live seam is the generic wrapper cleanup helper `terminateChildProcess(...)`; the restart-specific `ensureTrackedProcessTreeExited(...)` path from `CO-163` is already narrowed and out of scope for this follow-up.
  - 2026-04-13: Pre-implementation issue-quality review approved the bounded fix surface: generic forced cleanup should match the restart-specific process-group-only safety bar without changing stale-host teardown authority or provider workflow behavior.
  - 2026-04-13: The first audited `docs-review` child stream failed closed on the repo line-budget guard (`docs/TASKS.md` at `452 > 450`); `npm run docs:archive-tasks` restored compliance, displaced snapshots `1014` and `1015` were restored into tracked `docs/TASKS-archive-2026.md`, and the rerun child stream succeeded with `review_outcome: clean-success` under `.runs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd-docs-review/cli/2026-04-12T20-59-41-592Z-468ab71c/manifest.json`.
  - 2026-04-13: Implementation landed exactly on the intended seam: `terminateChildProcess(...)` now keeps descendant inspection diagnostic-only after process-group cleanup, the dead `killProcess` option was removed during the elegance pass, and the focused `ControlHostSupervision.test.ts` regression proves detached-worker survival.
  - 2026-04-13: Wrapper-led standalone review drifted without terminal telemetry or a concrete diff-local verdict, so manual review and elegance fallback notes were recorded instead of stalling the lane.
---

# Technical Specification

## Context

`CO-163` already hardened the restart-specific stale-host cleanup path in `ensureTrackedProcessTreeExited(...)` so it force-kills only the stale supervised control-host process group and leaves descendants diagnostic-only. The adjacent generic cleanup path still diverges:

- `terminateChildProcess(...)` sends `SIGTERM` to the supervised wrapper child
- if the wrapper or its process group remains alive past the timeout, the helper kills the stale control-host process group
- after that, it still enumerates descendant pids and issues descendant `SIGKILL`s before killing the wrapper itself

Detached `provider-linear-worker` issue runs can remain descendants of the old control-host until reparenting even when they are already in their own session/process group. The descendant `SIGKILL` escalation therefore remains a real collateral risk outside the already-fixed `CO-163` seam.

## Requirements
1. Generic control-host forced cleanup must continue to kill the stale control-host process group when timeout escalation is required.
2. Generic forced cleanup must stop issuing descendant `SIGKILL`s outside that stale process group.
3. Descendant/process-group inspection must remain available as diagnostics rather than disappearing.
4. The fix must not change `CO-163` restart-specific cleanup semantics.
5. Focused regression coverage must prove a detached provider worker in a separate process group survives generic cleanup.

## Design
- Keep `terminateChildProcess(...)` as the single generic teardown helper.
- Preserve the existing `SIGTERM` -> process-group `SIGKILL` escalation for stale control-host teardown.
- Remove descendant `SIGKILL` escalation after process-group cleanup.
- Preserve the wrapper-child `child.kill('SIGKILL')` fallback so the supervisor still finishes its own teardown deterministically.
- Update focused tests to assert that descendant lookup may still occur for diagnostics, but detached descendants are not killed.

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- Expected tests:
  - `orchestrator/tests/ControlHostSupervision.test.ts`

## Protected Expectations
- Do not weaken stale control-host teardown.
- Do not reopen `CO-163` restart cleanup logic.
- Do not kill detached provider-worker issue processes.
- Do not remove descendant/process-group diagnostics.

## Reject These Wrong Interpretations
- "This is still the `CO-163` restart path."
- "Descendants should still be killed to be safe."
- "This can be solved by increasing the timeout."
- "The fix should rewrite broader provider-worker lifecycle behavior."

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth: generic cleanup escalates from process-group kill into descendant `SIGKILL`s.
- Reference truth: stale-host teardown is process-group-scoped and descendant inspection is diagnostic-only.
- Target truth / intended delta: generic cleanup now matches the restart-specific safety posture while keeping diagnostics observable.
- Explicitly out-of-scope differences: restart payload changes, owner-artifact redesign, and workflow-state logic.

## Not Done If
- Generic cleanup can still `SIGKILL` detached provider workers.
- Descendant/process-group diagnostics become less observable.
- The stale control-host process group can remain alive because cleanup authority was reduced too far.

## Validation Plan
- Audited `linear child-stream --pipeline docs-review` before implementation, or a truthful direct fallback if provenance fails closed again.
- Focused `ControlHostSupervision.test.ts` coverage for timeout cleanup and detached descendant preservation.
- Required repo validation floor before review handoff.

## Validation Status
- Focused regression completed: `npx vitest run orchestrator/tests/ControlHostSupervision.test.ts` passed (`59` tests).
- Validation completed: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed.
- Standalone/elegance gate completed via manual fallback after the wrapper drifted: `out/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/manual/20260412T211802Z-review-fallback.md` and `out/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/manual/20260412T211802Z-elegance-review.md`.
- Remaining blocker: full `npm run test` still fails in unrelated suites `ProviderIssueHandoffAdmissionCache.test.ts` and `ProviderLinearWorkerRunner.test.ts`; tracked follow-up `CO-165` carries that separate repair scope.

## Approvals
- Reviewer: pending docs-review evidence for the CO-164 packet
- Date: 2026-04-13
