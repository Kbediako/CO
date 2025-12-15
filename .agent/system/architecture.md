# System Architecture

Codex Orchestrator is the “wrapper repo” that coordinates agentic work across multiple downstream projects. The repo is organized around a simple loop:

1) Choose a task id (`<id>-<slug>`) and write scope docs in `docs/`.
2) Execute a pipeline (usually `diagnostics`) via `codex-orchestrator`.
3) Capture evidence in `.runs/<task-id>/cli/<run-id>/manifest.json` and mirror outcomes into checklists under `tasks/`, `docs/TASKS.md`, and `.agent/task/`.

## Topology (local-first)
- **CLI entrypoint:** `bin/codex-orchestrator.ts` (compiled to `dist/bin/codex-orchestrator.js` via `npm run build`).
- **Pipeline definitions:** `codex.orchestrator.json` (e.g., `diagnostics`, `diagnostics-with-eval`, `tfgrpo-learning`).
- **Orchestrator core:** `orchestrator/src/**` (manager + CLI wiring + persistence).
- **Shared packages:** `packages/orchestrator/**` (tooling/approvals/sandbox helpers) and `packages/shared/**` (types/schemas/config helpers).
- **Adapters / integrations:** `adapters/**` (optional connectors and supporting utilities).
- **Patterns / codemods:** `patterns/**` and `eslint-plugin-patterns/**` (compiled via `npm run build:patterns`).
- **Evaluation harness:** `evaluation/harness/**` and `evaluation/tests/**` (opt-in checks via `npm run eval:test`).
- **Downstream projects:** `packages/<project>/**` (each project keeps its own code/config/assets under `packages/`).

## Data flow (task → pipeline → evidence)
1. **Task context** is identified by `MCP_RUNNER_TASK_ID=<task-id>` (and/or `--task <task-id>` in the CLI).
2. `npx codex-orchestrator start <pipeline> --format json --no-interactive --task <task-id>` executes the pipeline stage-by-stage.
3. The CLI writes the canonical run manifest to `.runs/<task-id>/cli/<run-id>/manifest.json` (layout details in `.runs/README.md`).
4. After completion, summaries and reviewer-facing snapshots are mirrored under:
   - `.runs/<task-id>/metrics.json` (append-only JSONL stream)
   - `out/<task-id>/state.json` and `out/<task-id>/runs.json`
5. Humans mirror progress into checklists:
   - `tasks/tasks-<id>-<slug>.md` (canonical checkboxes)
   - `docs/TASKS.md` (snapshot mirror)
   - `.agent/task/<id>-<slug>.md` (agent-facing mirror)

## Instruction resolution
The orchestrator resolves run instructions by concatenating Markdown in this order:
1. `AGENTS.md` (repo root)
2. `docs/AGENTS.md`
3. `.agent/AGENTS.md`

See `docs/guides/instructions.md` for the loader behavior and the manifest fields used to audit instruction drift.
