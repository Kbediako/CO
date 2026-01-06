# Task 0935 - Manifest Persister Throughput

- MCP Task ID: `0935-manifest-persister-throughput`
- Primary PRD: `docs/PRD-manifest-persister-throughput.md`
- Tech Spec: `docs/TECH_SPEC-manifest-persister-throughput.md`
- Action Plan: `docs/ACTION_PLAN-manifest-persister-throughput.md`
- Mini-spec: `tasks/specs/0935-manifest-persister-throughput.md`
- Run Manifest (docs review): `.runs/0935-manifest-persister-throughput/cli/2026-01-06T00-27-16-820Z-ca34f41d/manifest.json`
- Metrics/State: `.runs/0935-manifest-persister-throughput/metrics.json`, `out/0935-manifest-persister-throughput/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-manifest-persister-throughput.md`, `docs/TECH_SPEC-manifest-persister-throughput.md`, `docs/ACTION_PLAN-manifest-persister-throughput.md`, `tasks/tasks-0935-manifest-persister-throughput.md`, `tasks/specs/0935-manifest-persister-throughput.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0935-manifest-persister-throughput-scout/cli/2026-01-05T23-40-50-659Z-0f65b4b0/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0935-manifest-persister-throughput/cli/2026-01-06T00-27-16-820Z-ca34f41d/manifest.json`, `docs/TASKS.md`, `.agent/task/0935-manifest-persister-throughput.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0935-manifest-persister-throughput/metrics.json`, `out/0935-manifest-persister-throughput/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0935-manifest-persister-throughput/cli/2026-01-05T23-49-32-830Z-56caf5aa/manifest.json`, `.runs/0935-manifest-persister-throughput/cli/2026-01-05T23-50-53-932Z-8c859dc0/manifest.json`, `tasks/tasks-0935-manifest-persister-throughput.md`.

### Implementation
- [x] Targeted performance fix + tests applied - Evidence: code changes, `.runs/0935-manifest-persister-throughput/cli/2026-01-05T23-58-37-316Z-069c2fc7/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0935-manifest-persister-throughput/cli/2026-01-05T23-58-37-316Z-069c2fc7/manifest.json`.

## Hotspot Summary (RLM)
- RLM run (1 iteration, validator none):
  - `ManifestPersister.flushPersist` awaits `writeManifest` then `writeHeartbeat`, so flush latency is the sum of both writes when both are dirty (worst at forced end-of-run flush).
  - `saveManifest` uses `writeJsonAtomic`, which does multiple filesystem operations; this makes sequential heartbeat writes pay the manifest cost before heartbeat completes.
  - Error handling re-dirties both flags even if only one write fails, creating redundant writes and extra flush time on retry.

## Candidate fixes
- Run manifest + heartbeat writes concurrently (e.g., `Promise.allSettled`) and only retry the failed channel.
- Preserve existing error precedence by throwing manifest errors first, then heartbeat errors.
- Add unit tests that assert concurrent start timing and single-channel retry behavior.

## Relevant Files
- `orchestrator/src/cli/run/manifestPersister.ts`
- `orchestrator/tests/ManifestPersister.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0935-manifest-persister-throughput-*/cli/<run-id>/manifest.json`.
