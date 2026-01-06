# Task 0939 - Orchestrator Performance & Reliability Loop 2

- MCP Task ID: `0939-orchestrator-performance-reliability-loop-2`
- Primary PRD: `docs/PRD-orchestrator-performance-reliability-loop-2.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-performance-reliability-loop-2.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-performance-reliability-loop-2.md`
- Mini-spec: `tasks/specs/0939-orchestrator-performance-reliability-loop-2.md`
- Run Manifest (docs review): `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`
- Metrics/State: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-orchestrator-performance-reliability-loop-2.md`, `docs/TECH_SPEC-orchestrator-performance-reliability-loop-2.md`, `docs/ACTION_PLAN-orchestrator-performance-reliability-loop-2.md`, `tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md`, `tasks/specs/0939-orchestrator-performance-reliability-loop-2.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2-scout/cli/2026-01-06T06-46-31-169Z-88ce91ef/manifest.json`, `.runs/0939-orchestrator-performance-reliability-loop-2-scout2/cli/2026-01-06T08-48-58-894Z-60645a3f/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`, `docs/TASKS.md`, `.agent/task/0939-orchestrator-performance-reliability-loop-2.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-51-26-814Z-8229d14a/manifest.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-53-37-814Z-c285a360/manifest.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-37-07-569Z-4f1a7a79/manifest.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T10-02-37-053Z-a853796a/manifest.json`, `tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md`.

### Implementation
- [x] Targeted performance/reliability fixes + tests/benchmarks applied - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-26-22-129Z-c2f9cb47/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-26-22-129Z-c2f9cb47/manifest.json`.


## Hotspot Summary (RLM)
- Experience injection fetches are O(N) per run: `bootstrapManifest` calls `ExperienceStore.fetchTop` for each prompt pack, which scans the full `out/<taskId>/experiences.jsonl` every time. As experience history grows (and domains repeat across prompt packs), this adds startup latency and extra I/O on the manifest/persistence path.

## Candidate fixes
- Deduplicate experience lookups per domain in `bootstrapManifest` (cache `fetchTop` results per domain + task) to avoid repeated scans when multiple prompt packs share a domain. Files: `orchestrator/src/cli/run/manifest.ts`. Tests: `orchestrator/tests/Manifest.test.ts` (new coverage) or a new targeted manifest injection test.
- Add optional scan budgets (`CODEX_EXPERIENCE_FETCH_MAX_LINES` / `CODEX_EXPERIENCE_FETCH_MAX_BYTES`) with an explicit `experiences_truncated` flag on prompt pack entries; default unlimited for behavior parity. Files: `orchestrator/src/persistence/ExperienceStore.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/types.ts`. Tests: `orchestrator/tests/ExperienceStore.test.ts`.
- Cache top-K per domain in a small index file (e.g., `experiences.top.json`) updated in `recordBatch`, and have `fetchTop` reuse it when the index is fresh (mtime/offset) with fallback to a full scan. Files: `orchestrator/src/persistence/ExperienceStore.ts`, `orchestrator/src/utils/atomicWrite.ts`. Tests: `orchestrator/tests/ExperienceStore.test.ts`.
- Add best-effort stream cleanup and empty-file short-circuiting in `scanRecords` to reduce FD churn and skip unnecessary reads. Files: `orchestrator/src/persistence/ExperienceStore.ts`. Tests: `orchestrator/tests/ExperienceStore.test.ts`.

## Relevant Files
- `orchestrator/src/persistence/ExperienceStore.ts`
- `orchestrator/src/cli/run/manifest.ts`
- `orchestrator/src/cli/types.ts`
- `orchestrator/tests/ExperienceStore.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0939-orchestrator-performance-reliability-loop-2-*/cli/<run-id>/manifest.json`.
- RLM rerun with `RLM_MAX_ITERATIONS=unlimited` failed (invalid max iterations); rerun succeeded with `RLM_MAX_ITERATIONS=0` + `RLM_MAX_MINUTES=10` per Oracle guidance.
