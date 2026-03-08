# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Low-Signal Drift Guard

## Goal

Use the extracted `ReviewExecutionState` owner from `1058` to classify bounded-review convergence more strictly and terminate low-signal drift with artifact-first failure output.

## Scope

- Extend `scripts/lib/review-execution-state.ts` with bounded drift-classification state derived from live output.
- Teach `scripts/run-review.ts` / `waitForChildExit(...)` to terminate on that classified drift path.
- Preserve current timeout, stall, startup-loop, and heavy-command enforcement behavior.
- Add targeted regression coverage and a manual artifact from the real `1058` review drift evidence.

## Design

### 1. Runtime-owned drift signals

`ReviewExecutionState` becomes the sole owner for:

- `thinking` block counts
- command-start counts
- normalized recent inspection targets / repeated-target streaks
- a bounded “meaningful progress” snapshot for monitor/error decisions

The module should expose a small snapshot/projection API rather than leaking internal counters back into `scripts/run-review.ts`.

### 2. Bounded low-signal guard

Add one bounded failure mode for review drift:

- only active in bounded review mode
- triggered by a sustained combination of repetitive inspection + no meaningful-progress change
- surfaced as a distinct failure reason, not merged into generic stall/timeout behavior

The top-level wrapper should still own termination wiring and raw stderr/stdout behavior, but classification must come from the shared state owner.

### 3. Artifact-first failure contract

When the new guard triggers:

- `review/output.log` remains intact
- telemetry persists with the low-signal drift classification
- stderr summary explains why the review was stopped
- the closeout/manual artifact can point to a deterministic failure reason instead of a vague manual stop

## Constraints

- Do not broaden the wrapper’s mutation authority or restart behavior.
- Do not copy Symphony’s autonomous approval or issue-lifecycle restart patterns.
- Keep the solution minimal and local to standalone review.

## Validation

- direct `ReviewExecutionState` drift-classification tests
- targeted `run-review` regression coverage for the new failure mode
- standard build/lint/docs checks
- `pack:smoke`
