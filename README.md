# Codex Orchestrator

Codex Orchestrator is the CLI + runtime that coordinates Codex-driven runs, pipelines, and delegation MCP tooling. The npm release focuses on running pipelines locally, emitting auditable manifests, and hosting the delegation server.

## Install

- Global install (recommended for CLI use):
  ```bash
  npm i -g @kbediako/codex-orchestrator
  ```
- Or run via npx:
  ```bash
  npx codex-orchestrator --version
  ```

Node.js >= 20 is required.

## Quick start

1. Set a task id so artifacts land under `.runs/<task-id>/`:
   ```bash
   export MCP_RUNNER_TASK_ID=<task-id>
   ```
2. Run a pipeline:
   ```bash
   npx codex-orchestrator start diagnostics --format json
   ```
3. Watch status:
   ```bash
   npx codex-orchestrator status --run <run-id> --watch --interval 10
   ```
4. Resume if needed:
   ```bash
   npx codex-orchestrator resume --run <run-id>
   ```

## Delegation MCP server

Run the delegation MCP server over stdio:
```bash
codex-orchestrator delegate-server --repo /path/to/repo --mode question_only
```

Register it with Codex once, then enable per run:
```bash
codex mcp add delegation -- codex-orchestrator delegation-server --repo /path/to/repo
codex -c 'mcp_servers.delegation.enabled=true' ...
```

## Skills (bundled)

The release ships skills under `skills/`. Install them into `$CODEX_HOME/skills`:
```bash
codex-orchestrator skills install
```

Options:
- `--force` overwrites existing files.
- `--codex-home <path>` targets a different Codex home directory.

Current bundled skills:
- `delegation-usage`

## DevTools readiness

Check DevTools readiness (skill + MCP config):
```bash
codex-orchestrator doctor --format json
```

Print DevTools MCP setup guidance:
```bash
codex-orchestrator devtools setup
```

## Common commands

- `codex-orchestrator start <pipeline>` — run a pipeline.
- `codex-orchestrator plan <pipeline>` — preview pipeline stages.
- `codex-orchestrator exec <cmd>` — run a one-off command with the exec runtime.
- `codex-orchestrator self-check --format json` — JSON health payload.
- `codex-orchestrator mcp serve` — Codex MCP stdio server.

## What ships in the npm release

- CLI + built-in pipelines
- Delegation MCP server (`delegate-server`)
- Bundled skills under `skills/`
- Schemas and templates needed by the CLI

## Repository + contributor guide

Repo internals, development workflows, and deeper architecture notes live here:
- `docs/README.md`
