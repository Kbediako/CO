# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Execution-Mode Lifecycle Shell Extraction

## Context

`1155` extracted the shared run-entry control-plane lifecycle shell for `start()` and `resume()`. The next highest-leverage duplication is now inside `orchestrator.ts` execution-mode handling: `executePipeline()` and `executeCloudPipeline()` still own materially similar lifecycle work around different local/cloud bodies.

## In Scope

- Add one bounded helper adjacent to `orchestrator.ts` that owns the shared execution lifecycle shell around local/cloud execution bodies
- Rewire the local and cloud execution paths in `orchestrator.ts` to delegate the duplicated lifecycle shell
- Preserve current ordering, error handling, persistence, and runtime semantics
- Keep focused execution lifecycle regressions green

## Out of Scope

- Merging local and cloud execution bodies
- Changing runtime selection or cloud preflight/fallback policy
- Reopening `ControlServer`, Telegram bridge/runtime, or observability/controller seams
- Provider-specific cloud executor refactors
- Manifest schema or run-event payload changes

## Design

1. Introduce one adjacent orchestrator helper that owns the shared execution lifecycle shell:
   - control watcher pre-body sync / resume / cancel checks
   - `in_progress` manifest transition and `runStarted` emission
   - advanced/autoscout note emission
   - heartbeat lifecycle and final persistence/finalization shell
2. Keep `orchestrator.ts` as the entrypoint and authority owner:
   - runtime selection remains in `performRunLifecycle(...)`
   - local stage/subpipeline execution remains local-only
   - cloud target resolution / executor wiring remains cloud-only
3. Preserve mode-specific semantics exactly:
   - do not leak local-only `ensureGuardrailStatus(...)` into cloud execution
   - preserve cloud `onUpdate` persistence / fallback behavior
   - preserve distinct failure detail strings and post-body sync behavior
4. Avoid reopening already-thinned startup-shell helpers unless a type must move to support the shared execution lifecycle contract.

## Validation

- Focused tests:
  - `orchestrator/tests/ControlWatcher.test.ts`
  - `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`
  - `tests/cli-orchestrator.spec.ts`
  - any new helper-local tests only if needed
- `delegation-guard`
- `spec-guard`
- `build`
- `lint`
- `test`
- `docs:check`
- `docs:freshness`
- `diff-budget`
- `review`
- `pack:smoke`
