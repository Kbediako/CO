# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-and-Run-Error Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction`
- Status: Draft

## Background

`performRunLifecycle(...)` is now mostly a high-level lifecycle coordinator after the recent bounded extractions:

- `1161`: completion
- `1162`: TaskManager registration
- `1163`: guard-and-planning

The last inline multi-line lifecycle block is now the execution / error shell:

1. `manager.execute(taskContext)`
2. `context.runEvents?.runError(...)`
3. rethrow of the original failure

This seam is thinner than the prior extractions, but it is still the last truthful lifecycle cluster that can move without recombining earlier boundaries.

## Scope

- Extract the execution / run-error shell from `performRunLifecycle(...)` into one bounded helper
- Move with that extraction:
  - `manager.execute(taskContext)`
  - `context.runEvents?.runError(...)`
  - the catch / rethrow path
- Return the exact `RunSummary` to the existing lifecycle owner
- Add focused regressions for the success and failure paths

## Out of Scope

- TaskManager registration extracted in `1162`
- Guard-and-planning extracted in `1163`
- Completion handling extracted in `1161`
- Public `start()` / `resume()` lifecycle entrypoints
- Broader orchestration or service refactors

## Proposed Approach

1. Introduce one bounded class-local helper adjacent to `performRunLifecycle(...)`.
2. Move only the `manager.execute(...)` plus `runError(...)` catch / rethrow shell into that helper.
3. Keep `performRunLifecycle(...)` as the owner of:
   - privacy reset
   - TaskManager registration helper invocation
   - guard-and-planning helper invocation
   - completion delegation
4. Add focused regressions that pin:
   - success returns the exact `RunSummary`
   - failure emits `runError(...)` once with the existing payload shape
   - the original error is rethrown unchanged

## Validation

- Focused orchestrator execution / run-error regressions
- Standard deterministic gate bundle before closeout
- Explicit standalone review and elegance review

## Risks

- Pulling completion into this helper would reopen the `1161` seam.
- Pulling registration or guard-and-planning into this helper would recombine previously separated lifecycle ownership.
- If the helper becomes a trivial pass-through without preserving a real boundary, the seam stops being worthwhile and the next move should become a broader reassessment instead.
