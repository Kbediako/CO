# Task Checklist — Orchestrator Refactor Roadmap (0913)

> Set `MCP_RUNNER_TASK_ID=0913-orchestrator-refactor-roadmap` for orchestrator commands. Mirror status with `tasks/tasks-0913-orchestrator-refactor-roadmap.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0913-orchestrator-refactor-roadmap/cli/<run-id>/manifest.json`).

## Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0913-orchestrator-refactor-roadmap.md`, `tasks/index.json`) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL), `out/0913-orchestrator-refactor-roadmap/state.json`.
- [x] `tasks/index.json` gate metadata updated with docs-review manifest - Evidence: `tasks/index.json`, `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.

## Refactor phases (implementation roadmap)
- [ ] Phase 1: Manifest correctness + atomic write safety (tests first, then refactor).
- [ ] Phase 2: Single-writer manifest persistence (coalescing persister; route direct `saveManifest` calls through it).
- [ ] Phase 3: Bounded exec event capture (opt-in first; preserve full `.ndjson` logs/handles).
- [ ] Phase 4: Execution mode resolution consolidation (no behavior change; keep existing precedence).
- [ ] Phase 5: Metrics + env hygiene (reduce metrics bloat; remove `process.env` leakage with compatibility window).

## Guardrails (for future implementation PRs)
- [ ] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
- [ ] `npm run build` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
- [ ] `npm run lint` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
- [ ] `npm run test` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
- [ ] `npm run docs:check` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
- [ ] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
- [ ] `npm run review` captured with NOTES - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/<implementation-gate-run-id>/manifest.json` (implementation gate).
