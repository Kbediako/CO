# API Surface

This repo’s “API surface” is mostly CLI-driven: commands, config files, and run artifacts that other humans/agents rely on.

## Primary CLI: `codex-orchestrator`

Built artifact: `dist/bin/codex-orchestrator.js` (compiled from `bin/codex-orchestrator.ts`).

Common commands (non-interactive friendly):
- **Run a pipeline:** `npx codex-orchestrator start diagnostics --format json --no-interactive --task <task-id>`
- **Plan a pipeline (no execution):** `npx codex-orchestrator plan diagnostics --format json`
- **Watch a run:** `npx codex-orchestrator status --run <run-id> --watch --interval 10 --format json`
- **Resume a run:** `npx codex-orchestrator resume --run <run-id>`

Pipelines are defined in `codex.orchestrator.json`. The default “core lane” is `diagnostics`:
- `npm run build`
- `npm run lint`
- `npm run test`
- `node scripts/spec-guard.mjs --dry-run`

## Configuration files
- `codex.orchestrator.json` — pipeline/stage definitions.
- `design.config.yaml` — design toolkit pipeline inputs (only used when running design pipelines).
- `mcp-client.json` — MCP client configuration for local tool wiring.
- `.eslintrc.cjs`, `tsconfig*.json`, `vitest.config*.ts` — lint/build/test configuration.

## Environment variables
- `MCP_RUNNER_TASK_ID` — task-scopes all run artifacts under `.runs/<task-id>/` and `out/<task-id>/`.
- `BASE_SHA` — optional override used by `scripts/spec-guard.mjs` to choose a diff base (CI sets this for PRs).
- `FEATURE_TFGRPO_GROUP` — enables grouped execution behavior for specific learning pipelines (see `codex.orchestrator.json`).

## NPM script surface
Canonical guardrails and tooling:
- `npm run build`
- `npm run lint`
- `npm run test`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run review` (runs `codex review --uncommitted` via `dist/scripts/run-review.js`)

Mirror/design tooling:
- `npm run mirror:fetch -- --project <name> [--dry-run] [--force]`
- `npm run mirror:serve -- --project <name> [--port <port>]`
- `npm run mirror:check -- --project <name>`

## Evidence artifacts (contract with reviewers)
The primary audit surface is the manifest written by the orchestrator:
- `.runs/<task-id>/cli/<run-id>/manifest.json`

Checklist mirrors must cite that manifest path when flipping `[ ] → [x]`:
- `tasks/tasks-<id>-<slug>.md`
- `docs/TASKS.md`
- `.agent/task/<id>-<slug>.md`
