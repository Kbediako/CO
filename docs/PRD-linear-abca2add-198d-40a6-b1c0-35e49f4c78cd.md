# PRD - CO: narrow generic control-host forced cleanup to avoid detached provider-worker collateral

## Added by Bootstrap 2026-04-13

## Traceability
- Linear issue: `CO-164` / `abca2add-198d-40a6-b1c0-35e49f4c78cd`
- Linear URL: https://linear.app/asabeko/issue/CO-164/co-narrow-generic-control-host-forced-cleanup-to-avoid-detached
- Related lanes:
  - `CO-152` / `linear-0d66d189-fc51-4054-80db-b6990858f33d`
  - `CO-163` / `linear-b84c9a78-b62f-48fa-b1c4-88f8222535da`

## Summary
- Problem Statement: `CO-163` narrowed the restart-specific stale-host cleanup path to kill only the stale supervised control-host process group, but the adjacent generic supervision teardown helper still escalates to descendant `SIGKILL`s during forced wrapper cleanup. Detached `provider-linear-worker` issue runs can remain descendants of the old control-host until reparenting even when they are intentionally outside the stale host process group, so the generic cleanup path can still kill the wrong processes as collateral.
- Desired Outcome: narrow generic control-host forced cleanup so it still tears down the stale supervised control-host process group reliably, preserves descendant/process-group diagnostics, and never `SIGKILL`s detached provider-worker issue runs simply because they remain descendants briefly.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the CO-164 follow-up in this workspace by changing only the generic control-host forced-cleanup seam that still kills descendant pids after a timed-out wrapper shutdown. The fix has to preserve the stale-host teardown contract, keep the restart-specific CO-163 semantics intact, and prove with regression coverage that a detached provider worker in another process group survives stale-host cleanup.
- Success criteria / acceptance:
  - generic control-host forced cleanup kills only the stale control-host process group and still tears down the stale host reliably
  - detached `provider-linear-worker` descendants are preserved while process-group and descendant evidence remain observable
  - focused regression coverage proves stale-host teardown does not kill a detached provider worker in a separate process group
- Constraints / non-goals:
  - do not change the already-narrowed `CO-163` restart cleanup semantics again
  - do not weaken stale control-host teardown or duplicate-host diagnostics
  - do not widen into provider worker review/merge workflow or timeout tuning

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `generic control-host forced cleanup`
  - `detached provider-linear-worker collateral`
  - `process-group-scoped teardown`
  - `descendant diagnostics`
- Protected terms / exact artifact and surface names:
  - `provider-linear-worker`
  - `control-host`
  - `terminateChildProcess(...)`
  - `ensureTrackedProcessTreeExited(...)`
  - `process group`
  - `descendant pids`
- Nearby wrong interpretations to reject:
  - "this is the CO-163 restart path again"
  - "just widen or loosen the stale-host teardown safety check"
  - "hide the issue by changing the timeout"
  - "kill all descendants to be safe"

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth:
  - `ensureTrackedProcessTreeExited(...)` already restricts the restart-specific stale-host cleanup to the tracked process group and leaves descendants diagnostic-only
  - `terminateChildProcess(...)` still escalates from process-group cleanup into descendant `SIGKILL`s during generic forced wrapper cleanup
  - detached provider workers can still appear in the stale host descendant tree briefly before reparenting
- Reference truth:
  - stale control-host teardown should remain process-group-scoped
  - detached provider workers should not be killed just because `ppid` has not reparented yet
  - operator-visible diagnostics should still expose which process-group and descendant pids were observed
- Target truth / intended delta:
  - generic forced cleanup matches the restart-specific process-group-only safety bar
  - descendant inspection remains available for diagnostics, not as a kill target
  - focused tests make the detached-worker preservation contract explicit
- Explicitly out-of-scope differences:
  - restart-specific `CO-163` cleanup behavior
  - duplicate-host evidence design
  - provider review/merge behavior

## Not Done If
- Generic control-host forced cleanup can still `SIGKILL` detached `provider-linear-worker` issue processes as collateral.
- Descendant/process-group diagnostics become less observable.
- The stale control-host process group can remain alive because cleanup was weakened too far.
- There is no regression proving a detached provider worker in a separate process group survives stale-host teardown.

## Goals
- Narrow the generic supervision teardown helper to force-kill only the stale control-host process group.
- Preserve descendant/process-group inspection so operator diagnostics stay machine-checkable.
- Add focused regression coverage for detached provider-worker preservation during generic cleanup.
- Keep the change bounded to the control-host supervision teardown seam plus related docs/tests.

## Non-Goals
- Reopening `CO-163` restart cleanup design.
- Changing duplicate-owner artifacts or provider intake claims.
- Changing provider worker review, merge, or handoff behavior.
- Timeout tuning as a substitute for teardown safety.

## Stakeholders
- Product: CO operators relying on safe stale-host cleanup during supervision incidents.
- Engineering: control-host supervision and provider-worker maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - generic forced cleanup no longer issues descendant `SIGKILL`s outside the stale control-host process group
  - stale control-host teardown still reaches a terminal stopped state under the same timeout contract
  - focused regression coverage proves detached provider workers remain alive
- Guardrails / Error Budgets:
  - process-group and descendant diagnostics remain inspectable
  - no weakening of stale-host teardown or restart-specific `CO-163` semantics
  - no unrelated supervision lifecycle refactor

## User Experience
- Personas:
  - operator supervising a local control-host via LaunchAgent
  - reviewer checking that forced cleanup is narrow and worker-safe
  - maintainer diagnosing stale-host incidents from machine-readable evidence
- User Journeys:
  - the supervised child ignores `SIGTERM`, generic cleanup escalates, kills the stale host process group, and leaves detached worker descendants alive
  - a reviewer inspects the regression and sees descendants remain diagnostic-only
  - an operator still has the same teardown evidence available without collateral worker loss

## Technical Considerations
- Architectural Notes:
  - the fix should stay in the existing generic teardown helper instead of adding a second cleanup path
  - descendant lookup is still useful for diagnostics even if descendants are not kill targets
  - restart-specific cleanup and generic wrapper cleanup should now share the same process-group-only safety posture
- Dependencies / Integrations:
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
  - `orchestrator/tests/ControlHostSupervision.test.ts`

## Open Questions
- None for the initial bounded implementation; the seam is already isolated to the generic teardown helper and its focused tests.

## Approvals
- Product: Linear issue `CO-164`
- Engineering: pending docs-review evidence for the CO-164 packet
- Design: N/A
