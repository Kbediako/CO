# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Meta-Surface Expansion Guard

## Goal

Use the extracted `ReviewExecutionState` owner to classify sustained off-task meta-surface expansion from live runtime facts and terminate bounded review with artifact-first failure output.

## Scope

- Extend `scripts/lib/review-execution-state.ts` with one bounded meta-surface expansion classification derived from live output.
- Teach `scripts/run-review.ts` / `waitForChildExit(...)` to terminate on that classified failure path.
- Preserve current timeout, stall, startup-loop, heavy-command, and low-signal nearby-drift behavior.
- Add targeted regression coverage and a manual artifact grounded in the real `1059` broadening evidence.

## Design

### 1. Runtime-owned meta-surface signals

`ReviewExecutionState` becomes the sole owner for:

- recent meta-surface command/tool samples
- bounded counts by meta-surface kind
- a small projection describing whether bounded review is widening into off-task meta work

The state owner should derive these signals from canonical runtime facts already visible in the wrapper output, not from semantic judgments about the content of the reviewer’s prose.

### 2. Bounded meta-surface expansion guard

Add one bounded failure mode for off-task broadening:

- only active in bounded review mode
  - bounded review mode here means the default non-`CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1` path; it does not require strict heavy-command termination enforcement
- triggered by sustained recent activity across explicit meta-surfaces, for example:
  - `~/.codex/memories/**`
  - `~/.codex/skills/**`
  - `.runs/**/manifest.json`
  - `.runs/**/runner.ndjson`
  - nested review/orchestration/delegation control activity
- tolerant of incidental single-sample lookups
- surfaced as a distinct failure reason, not merged into generic stall/timeout or nearby-file low-signal drift behavior

The top-level wrapper should still own termination wiring and raw stderr/stdout behavior, but classification must come from the shared state owner.

### 3. Artifact-first failure contract

When the new guard triggers:

- `review/output.log` remains intact
- telemetry persists with the meta-surface expansion classification
- stderr summary explains why bounded review was stopped
- the closeout/manual artifact can point to a deterministic bounded failure reason instead of a vague active-but-off-task run

## Constraints

- Do not broaden the wrapper’s mutation authority or restart behavior.
- Do not copy Symphony’s autonomous issue-lifecycle or scheduler ownership.
- Keep the solution minimal and local to standalone review reliability.

## Validation

- direct `ReviewExecutionState` meta-surface classification tests
- targeted `run-review` regression coverage for the new failure mode
- standard build/lint/docs checks
- `pack:smoke`
