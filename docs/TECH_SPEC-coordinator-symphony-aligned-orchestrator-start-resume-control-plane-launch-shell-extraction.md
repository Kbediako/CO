# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Start-Resume Control-Plane Launch Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction`

## Problem Statement

At registration, `CodexOrchestrator.start()` and `CodexOrchestrator.resume()` duplicated the same control-plane launch lifecycle wrapper around already-prepared run context. That duplication made the remaining public-entry shell larger than necessary and obscured the one real divergence: `resume()`'s pre-start failure persistence contract. The working tree now contains the extracted `withControlPlaneLifecycle(...)` helper, so this packet must describe and validate that landed seam truthfully.

## Proposed Change

Use the adjacent `withControlPlaneLifecycle(...)` helper on `CodexOrchestrator` as the extracted seam. It owns:

- emitter selection
- control-plane lifecycle startup
- invocation of a lifecycle-scoped callback
- guaranteed lifecycle close in `finally`

`resume()` supplies an optional `onStartFailure` callback so the shared helper preserves the existing manifest failure persistence behavior without moving resume-specific preparation into the helper.

## Constraints

- Keep preparation logic in `start()` and `resume()`.
- Keep `performRunLifecycle(...)` and `startOrchestratorControlPlaneLifecycle(...)` ownership unchanged.
- Preserve current `runId` handling: `start()` uses the newly generated run id, `resume()` uses `manifest.run_id`.
- Do not broaden scope into execution routing, control-plane internals, or manifest persistence abstractions.

## Validation Plan

- Focused regressions:
  - `tests/cli-orchestrator.spec.ts`
  - `orchestrator/tests/OrchestratorCleanupOrder.test.ts`
- Full deterministic lane:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
