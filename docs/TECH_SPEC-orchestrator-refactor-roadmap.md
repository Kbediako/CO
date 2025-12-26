# Technical Spec - Orchestrator Refactor Roadmap (Task 0913)

## Overview
- Objective: Land a sequence of behavior-preserving refactors that simplify orchestrator execution/persistence and reduce runtime cost, while increasing correctness guarantees via targeted tests.
- In Scope:
  - CLI run lifecycle + persistence (`orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/metrics/*`).
  - Exec tool orchestration + telemetry capture (`packages/orchestrator/src/tool-orchestrator.ts`, `packages/orchestrator/src/exec/unified-exec.ts`, `orchestrator/src/cli/services/commandRunner.ts`).
  - Execution mode resolution consistency (`orchestrator/src/manager.ts`, `orchestrator/src/utils/executionMode.ts`, `orchestrator/src/cli/adapters/CommandPlanner.ts`).
- Out of Scope:
  - New pipelines, UI features, or control-plane behavior changes.
  - Breaking changes to manifest schema or CLI commands.

## Architecture & Design
### Current State
- Manifest updates happen through a mix of patterns:
  - `executePipeline` mutates entries directly (`orchestrator/src/cli/orchestrator.ts`, method `executePipeline`).
  - `updateCommandStatus` replaces `manifest.commands[i]` with a new object (`orchestrator/src/cli/run/manifest.ts`, function `updateCommandStatus`), which can create stale references if callers keep the old object.
- Atomic writes use a temp name derived from `pid` + `Date.now()` (`orchestrator/src/utils/atomicWrite.ts`), which is low entropy under concurrent writes and can collide on some filesystems/timing.
- Exec events are stored in-memory and copied into tool run records (`packages/orchestrator/src/exec/unified-exec.ts`, method `attachManifestMetadata`) with no cap on the number of chunk events, even though stdout/stderr buffers are capped.
- Multiple services call `saveManifest` directly, bypassing `executePipeline`’s throttled persistence queue (`orchestrator/src/cli/services/*`, `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/services/runSummaryWriter.ts`).
- Mode selection (“mcp vs cloud”) is implemented in multiple places with different trim/precedence semantics (documented by `orchestrator/tests/ExecutionModeResolution.test.ts`).

### Proposed Changes (phased, mergeable)
1. Manifest correctness + atomic write safety
   - Ensure command entry finalization cannot lose updates due to stale object references.
   - Make atomic temp paths collision-resistant while preserving atomic rename semantics.
2. Single-writer manifest persistence
   - Introduce a minimal “manifest persister” that coalesces writes and provides one codepath to persist manifest/heartbeat updates.
   - Mechanically route direct `saveManifest` calls through the persister where feasible, without changing persisted JSON content.
3. Bounded exec event capture (opt-in first)
   - Add an event capture policy that preserves current behavior by default but supports bounded capture for high-volume commands.
   - Keep full-fidelity logs in `.ndjson` and streaming handles; cap only in-memory `record.events`.
4. Execution mode resolver consolidation
   - Centralize mode parsing into a single helper that can preserve existing precedence rules per call site (no behavior change until explicitly decided).
5. Metrics + env hygiene (later phase)
   - Reduce metrics bloat by referencing privacy logs rather than embedding full decision arrays (with a compatibility window).
   - Avoid mutating `process.env` for pipeline selection; pass env overrides explicitly where needed.

### Data Persistence / State Impact
- Keep `packages/shared/manifest/types.ts` schemas stable. Any new fields must be optional and backward compatible.
- Prefer moving data to existing log artifacts (runner logs, per-command logs, privacy logs) rather than embedding more into metrics.

### External Dependencies
- None planned. Prefer using existing Node.js primitives and current repo utilities.

## Operational Considerations
- Failure Modes:
  - Partial/incorrect manifest updates during thrown exceptions or nested subpipeline runs.
  - Excess IO churn from redundant manifest writes (especially during noisy exec output).
  - Memory growth from retaining all chunk events in `ToolRunRecord.events`.
- Observability & Telemetry:
  - Standardize `manifest.status_detail` and `appendCommandError(... reason ...)` values into a small taxonomy (behavior-preserving; mostly internal consistency).
  - Keep evidence capture intact: manifests, logs, and metrics aggregation remain available for reviewers.
- Security / Privacy:
  - Do not weaken privacy guard behavior (`orchestrator/src/privacy/*`); only adjust where data is stored/counted.
- Performance Targets:
  - Reduce “writes per run” for manifests/heartbeats without delaying terminal state persistence.
  - Ensure bounded memory usage for very chatty commands while preserving full logs.

## Testing Strategy
- Unit / Integration:
  - Add tests *before* refactors for:
    - `executePipeline` correctly finalizing manifest entries when `runCommandStage` throws.
    - Atomic write temp path uniqueness under forced same-time writes.
    - Exec event bounding behavior (opt-in mode) without breaking existing small-output behavior.
    - A manifest persistence “single writer” invariant (no overlapping atomic writes).
- Tooling / Automation:
  - Docs review gate: `codex-orchestrator start docs-review` (spec-guard, docs:check, review).
  - Implementation gates (future): `codex-orchestrator start implementation-gate` after code changes land.
- Rollback Plan:
  - Use opt-in flags for the highest-risk behavior changes (bounded event capture, metrics payload reduction) until validated in practice.
  - Keep refactors independently revertible by landing them in small PRs.

## Documentation & Evidence
- Linked PRD: `docs/PRD-orchestrator-refactor-roadmap.md`
- Run Manifest (docs review): `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json` _(status: `succeeded`)._
- Metrics / State Snapshots: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL; one entry per run), `out/0913-orchestrator-refactor-roadmap/state.json` (latest snapshot)

## Open Questions
- Which consumer(s) (if any) rely on full `ToolRunRecord.events` chunk history today, and what compatibility window is acceptable for a bounded default?
- Do we want a strict requirement that all manifest writes funnel through the persister (enforced by lint/test), or keep it as a convention?

## Approvals
- Engineering: pending
- Reviewer: pending
