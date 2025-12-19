# Task Checklist — Codex Orchestrator Slimdown (0707)

> Set `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` for orchestrator commands. Keep mirrors in sync with `tasks/tasks-0707-orchestrator-slimdown.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`).

## Foundation
- [x] Diagnostics manifest captured under `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [ ] Metrics/state snapshots updated (`.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`).
- [ ] CI/test coverage policy mirrored in PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: manifest for the documentation update or follow-up diagnostics.

## Deliverables
- [ ] Manifest canonicalized from `schemas/manifest.json` with generated TS types + AJV validator; duplicate schema removed.
- [ ] Agent SDK deps removed from `package.json`/lockfile with usages pruned or shimmed.
- [ ] Core build config/script added; `npm run build` = core, `npm run build:all` = full matrix.
- [ ] Design deps optional + lazy-loaded across toolkits and mirror scripts with runtime guidance.
- [ ] Patterns lint guard builds `dist/patterns/linters/index.js` only when missing/outdated.
- [ ] Exec command modularized without behavior change (TFGRPO/learning preserved).
- [ ] Scoped test scripts added (`test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` = core).
- [ ] Add characterization tests for execution-mode resolution (flags, metadata modes, parallel override).
- [ ] Unify execution-mode logic behind a shared helper while preserving current behavior.
- [ ] Unify task/run ID sanitization behind a shared helper with identical error messages.
- [ ] Extract shared lock retry helper for TaskStateStore and ExperienceStore.
- [ ] Verify atomic write helper behavior (directory creation, temp naming) before unifying.
- [ ] Unify atomic write helpers with explicit options after verification (Needs Verification).
- [ ] Simplify CLI pipeline result wrappers with explicit result storage.
- [ ] Share enforcement-mode parsing between control-plane and privacy guard.
- [ ] Verify error string expectations before centralizing error formatting.
- [ ] Centralize error message formatting without changing prefixes or strings (Needs Verification).
