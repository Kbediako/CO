# Task Checklist — Codex Orchestrator Slimdown (0707)

> Export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` before executing orchestrator commands. Mirror status across `/tasks`, `docs/TASKS.md`, and `.agent/task/0707-orchestrator-slimdown.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`) that proves completion.

## Foundation
- [x] Capture first diagnostics manifest under `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [ ] Update metrics/state snapshots once runs exist (`.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`).
- [ ] CI/test coverage policy recorded across PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: attach the manifest that logged the documentation update or follow-up diagnostics run.

## Manifest Single Source of Truth
- [ ] Schema canonicalized at `schemas/manifest.json`, generated TS types + AJV validator emitted, duplicate schema removed; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

## Dependency Cleanup
- [ ] Unused agent SDK deps removed from `package.json`/lockfile with codepaths pruned or shimmed; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

## Build Surface Split
- [ ] Core-only build config/script added (`tsconfig.build.json`, `npm run build`), full matrix available via `npm run build:all`; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

## Optional/Lazy Design Dependencies
- [ ] Playwright/pixelmatch/pngjs/cheerio moved to optional/dev deps and lazy-loaded across design toolkits + mirror scripts with runtime guidance; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

## Lint Guard for Patterns
- [ ] `eslint-plugin-patterns/index.cjs` builds `dist/patterns/linters/index.js` only when missing/outdated; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

## Exec Command Modularization
- [ ] `orchestrator/src/cli/exec/command.ts` decomposed into focused modules preserving TFGRPO/learning flows; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

## Scoped Test Scripts
- [ ] Scoped test scripts wired (`test:orchestrator`, `test:adapters`, `test:evaluation`) with default `npm test` running core suites; Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
