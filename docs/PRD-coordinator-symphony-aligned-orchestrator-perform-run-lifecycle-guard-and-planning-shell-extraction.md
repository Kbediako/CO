# PRD: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Guard-and-Planning Shell Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction`

## Background

After `1162` moved TaskManager registration into a class-local helper, the next dense inline cluster in `performRunLifecycle(...)` is the post-privacy-reset guard-and-planning sequence:

- `this.controlPlane.guard(...)`
- `this.scheduler.createPlanForRun(...)`

Those two calls already route through dedicated services, but the surrounding lifecycle still owns their ordering and shared inputs inline.

## Goal

Extract one bounded guard-and-planning helper adjacent to `performRunLifecycle(...)`, moving only that ordered orchestration shell out of the inline body while preserving current lifecycle authority and keeping task-manager registration, execution, error handling, completion, and public entrypoints where they already belong.

## Non-Goals

- Moving the explicit privacy reset into the helper by default
- Reopening the `1162` task-manager registration seam
- Extracting `manager.execute(...)` and `runError(...)`
- Reopening completion handling extracted in `1161`
- Touching Telegram / Linear / ControlServer surfaces

## Success Criteria

- `performRunLifecycle(...)` delegates the guard-and-planning shell through one bounded helper
- Guard runs before scheduler planning with unchanged shared inputs
- Guard failure short-circuits scheduler planning
- Focused regressions cover ordering and forwarding without re-testing service internals
