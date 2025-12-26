# PRD - Orchestrator Refactor Roadmap (Task 0913)

## Summary
- Problem Statement: The orchestrator core and CLI runtime have accrued duplicated policy logic (execution mode parsing), multiple persistence/write paths (manifest + metrics + logs), and heavyweight tool/event capture that can degrade robustness and performance (IO churn, memory growth) and makes changes riskier than necessary.
- Desired Outcome: A phased, behavior-preserving refactor roadmap that simplifies hot paths (run execution + persistence + exec telemetry) while strengthening tests/guards so we can safely land incremental PRs with low regression risk.

## Goals
- Preserve externally observable behavior and public contracts (CLI surface, manifest schema, task layout).
- Reduce risk hotspots: manifest correctness under failures, atomic write collision risk, write storms, and unbounded exec event capture.
- Reduce duplication/coupling by consolidating “one concept → one resolver” logic (e.g., execution mode).
- Make performance improvements measurable (baseline + success thresholds) before landing larger refactors.
- Prefer simplification/deletion over new abstraction; introduce flags only when needed for rollback.

## Non-Goals
- New product features (pipelines, UI, new control plane behavior).
- Schema redesigns for manifests or metrics (prefer backward-compatible evolution only when necessary).
- Large rewrites of orchestration flow; changes should be incremental and independently mergeable.
- Introducing new dependencies unless a clear, measurable need exists.

## Stakeholders
- Product: Platform enablement / orchestrator users
- Engineering: Orchestrator maintainers (CLI + runtime)
- Design: N/A (CLI/runtime scope)

## Metrics & Guardrails
- Primary Success Metrics:
  - Manifest correctness: failure paths consistently record `commands[i].status`, `completed_at`, and `error_file` (where applicable) with no “stale entry” anomalies.
  - Performance: reduced manifest/heartbeat write frequency on typical runs; bounded memory for noisy exec output without losing audit logs.
  - Maintainability: fewer duplicated mode/policy implementations; clearer ownership boundaries per module.
- Guardrails / Error Budgets:
  - No change to manifest schema without explicit compatibility plan.
  - All refactors gated by targeted regression tests added *before* the refactor.
  - Prefer opt-in flags for risky behavior changes (e.g., bounded exec event capture), with default preserving current behavior initially.

## User Experience
- Personas:
  - Engineers running `codex-orchestrator` pipelines locally.
  - Reviewers inspecting `.runs/<task>/.../manifest.json` and logs.
  - Automation that tails events/manifests for status.
- User Journeys:
  - A run fails mid-stage and the manifest reliably reflects the failure (status detail, error file, summaries).
  - A run produces noisy output without growing unbounded memory or artifacts, while still keeping full logs/handles for audit.
  - Mode selection (“mcp vs cloud”) is consistent and predictable across planner/manager/CLI.

## Technical Considerations
- Primary hotspots and targets:
  - Manifest update correctness + atomic writes: `orchestrator/src/cli/orchestrator.ts` (`executePipeline`), `orchestrator/src/cli/run/manifest.ts` (`updateCommandStatus`), `orchestrator/src/utils/atomicWrite.ts`.
  - Exec telemetry/event capture: `packages/orchestrator/src/exec/unified-exec.ts` (`UnifiedExecRunner.run`, `record.events`), `orchestrator/src/cli/services/commandRunner.ts` (`streamEvent` fanout).
  - Manifest write coordination: `orchestrator/src/cli/orchestrator.ts` (`schedulePersist`) vs direct `saveManifest` calls across services.
  - Mode parsing duplication: `orchestrator/src/manager.ts`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/adapters/CommandPlanner.ts`.
- Mini-spec (implementation guardrails + rollout sequencing): `tasks/specs/0913-orchestrator-refactor-roadmap.md`.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-orchestrator-refactor-roadmap.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-refactor-roadmap.md`
- Task checklist: `tasks/tasks-0913-orchestrator-refactor-roadmap.md`
- Run Manifest (docs review): `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json` _(status: `succeeded`)._
- Metrics / State Snapshots: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL; one entry per run), `out/0913-orchestrator-refactor-roadmap/state.json` (latest snapshot)

## Open Questions
- Should bounded exec event capture become the default once proven, or remain opt-in with a documented “full capture” mode?
- Should metrics stop embedding full `privacy_events` once `privacy-decisions.ndjson` is canonical, and if so, what compatibility window do downstream consumers need?

## Approvals
- Product: pending
- Engineering: pending
- Design: N/A
