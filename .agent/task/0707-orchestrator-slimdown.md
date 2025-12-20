# Task Checklist — Codex Orchestrator Slimdown (0707)

> Set `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` for orchestrator commands. Keep mirrors in sync with `tasks/tasks-0707-orchestrator-slimdown.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`).

## Foundation
- [x] Diagnostics manifest captured under `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [x] Metrics/state snapshots updated (`.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`). Evidence: `.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`.
- [x] CI/test coverage policy mirrored in PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.

## Deliverables
- [x] Manifest canonicalized from `schemas/manifest.json` with generated TS types + AJV validator; duplicate schema removed. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Agent SDK deps removed from `package.json`/lockfile with usages pruned or shimmed. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Core build config/script added; `npm run build` = core, `npm run build:all` = full matrix. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Design deps optional + lazy-loaded across toolkits and mirror scripts with runtime guidance. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Patterns lint guard builds `dist/patterns/linters/index.js` only when missing/outdated. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Exec command modularized without behavior change (TFGRPO/learning preserved). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Scoped test scripts added (`test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` = core). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Add characterization tests for execution-mode resolution (flags, metadata modes, parallel override). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Unify execution-mode logic behind a shared helper while preserving current behavior. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Unify task/run ID sanitization behind a shared helper with identical error messages. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Extract shared lock retry helper for TaskStateStore and ExperienceStore. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Verify atomic write helper behavior (directory creation, temp naming) before unifying. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Unify atomic write helpers with explicit options after verification (Needs Verification). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Simplify CLI pipeline result wrappers with explicit result storage. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Share enforcement-mode parsing between control-plane and privacy guard. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Verify error string expectations before centralizing error formatting. Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Centralize error message formatting without changing prefixes or strings (Needs Verification). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
