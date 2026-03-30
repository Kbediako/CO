# PRD - CO: Auto-resume or fail explicitly after interrupted Merging-stage merge drain

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-51` / `d223e9f3-3708-40d9-abfe-14c305a8c3aa`
- Linear URL: https://linear.app/asabeko/issue/CO-51/co-auto-resume-or-fail-explicitly-after-interrupted-merging-stage
- Required baseline: `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/manifest.json`, `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/runner.ndjson`, `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/provider-linear-worker-linear-audit.jsonl`
- Related evidence issues: `CO-40`, `CO-41`

## Summary
- Problem Statement: A provider-worker continuation can correctly re-enter the `Merging` phase, start the `pr resolve-merge` shepherd loop, then exit on transient late review or check activity during the quiet window without leaving a truthful auto-resume path or an explicit terminal operator action. When the PR later returns to `OPEN`, `MERGEABLE`, `CLEAN`, with unresolved review threads back at `0`, the issue can remain parked in `Merging` until an operator manually reruns `pr resolve-merge`.
- Desired Outcome: Make the `Merging` continuation truthful and recoverable. If a merge drain is interrupted by late review or check activity that later clears, the worker should resume automatically and finish the merge, or it should fail explicitly with machine-checkable operator guidance instead of silently requiring a manual rerun.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete `CO-51` in the current workspace by repairing the narrow `Merging`-stage continuation seam from `CO-41`/PR `#324`, keeping the worker and operator artifacts truthful, adding focused regression coverage for the late-review-noise recovery sequence, and following the repo’s docs/review workflow before any handoff.
- Success criteria / acceptance:
  - an interrupted merge drain no longer strands the issue in `Merging` once the PR returns to a clean mergeable state
  - the worker either resumes automatically or emits an explicit machine-checkable terminal/action-required result
  - merge lifecycle artifacts record quiet-window start, interruption reason, retry decision, and final terminal outcome
  - focused regression coverage exercises the clean start -> late review noise -> clean recovery sequence
  - closeout includes real or simulated proof for the `CO-41` / `#324` incident class
- Constraints / non-goals:
  - keep stale active-run claim pickup (`CO-40`) and refresh/poll stall diagnostics (`CO-41`) out of scope
  - stay bounded to `Merging`-stage continuation, merge shepherd retry/terminal handling, and adjacent operator artifacts
  - avoid widening into unrelated PR CI failures where the PR never becomes clean and mergeable again

## Goals
- Identify the exact decision point where a late merge-drain interruption currently exits without a truthful continuation or explicit operator action.
- Add a bounded recovery contract so a transient interruption can either re-arm automatic merge completion or fail closed with explicit operator guidance.
- Persist operator-facing evidence for merge-drain lifecycle phases and retry outcomes.
- Add focused regression coverage for the `CO-41` / `#324` late-review interruption and clean-state recovery sequence.

## Non-Goals
- Reworking the stale later-`Merging` pickup logic already fixed in `CO-40`.
- Reworking the control-host refresh lifecycle stall diagnostics already fixed in `CO-41`.
- Fixing arbitrary PR failures where checks or review blockers never return to a clean mergeable state.

## Stakeholders
- Product: CO operators and reviewers expecting issue state to stay truthful through review-to-merge handoff
- Engineering: CO maintainers responsible for provider-worker continuation correctness and merge automation reliability
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - a late-review or late-check interruption that later clears does not require a manual `pr resolve-merge` rerun to finish landing the PR
  - worker proof, Linear audit, and related artifacts show interruption and retry lifecycle truthfully
  - the issue no longer remains parked in `Merging` solely because earlier transient merge noise ended the first drain attempt
- Guardrails / Error Budgets:
  - preserve fail-closed behavior when the PR does not actually return to a clean mergeable state
  - keep the implementation bounded to the provider-worker continuation, merge loop wrapper, and operator-facing proof/log surfaces
  - prefer explicit action-required evidence over silent abandonment when automatic recovery is unsafe

## User Experience
- Personas: provider worker owner, merge shepherd operator, reviewer resolving late Codex or CI noise
- User Journeys:
  - the worker reaches `Merging`, starts the quiet window, and records that phase explicitly
  - a transient late review/check event interrupts the drain, the worker records why, and either waits for clean recovery or emits a machine-checkable action-required result
  - once the PR returns to clean mergeable state, the worker resumes merge completion without needing a manual operator rerun

## Technical Considerations
- Architectural Notes:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` owns the top-level provider-worker run, proof, and child-stream artifacts
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` owns provider continuation, proof interpretation, retry, and post-worker state handling
  - merge shepherding currently relies on `pr ready-review` and `pr resolve-merge` behavior, but the provider continuation needs a truthful contract when a merge drain exits on transient late review noise
  - the existing proof and audit artifacts are the operator-facing source of truth and should expose interruption and retry decisions
- Dependencies / Integrations:
  - baseline incident artifacts from `CO-41` / PR `#324`
  - merge helper surfaces under `dist/bin/codex-orchestrator.js pr ...`
  - tests around provider worker continuation, Linear handoff, and merge watch/resolve behavior

## Open Questions
- Should clean-state recovery happen entirely inside the same provider continuation loop, or should it requeue a machine-checkable retry claim back through handoff state?
- What is the minimum explicit operator guidance payload when automatic resumption is unsafe or exceeds a bounded retry policy?

## Approvals
- Product: Self-approved from Linear issue scope
- Engineering: Pending docs-review and implementation validation
- Design: N/A
