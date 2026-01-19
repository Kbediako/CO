# Codex Orchestrator

![Setup demo](docs/assets/setup.gif)

Codex Orchestrator is the CLI + runtime that coordinates Codex-driven runs, pipelines, and delegation MCP tooling. The npm release focuses on running pipelines locally, emitting auditable manifests, and hosting the delegation server.

## Install

- Global install (recommended for CLI use):
  ```bash
  npm i -g @kbediako/codex-orchestrator
  ```
- After install, use either `codex-orchestrator` or the short alias `codex-orch`:
  ```bash
  codex-orchestrator --version
  ```
- Or run via npx:
  ```bash
  npx @kbediako/codex-orchestrator --version
  ```

Node.js >= 20 is required.

## Quick start

1. Run a pipeline with a task id so artifacts are grouped under `.runs/<task-id>/`:
   ```bash
   codex-orch start diagnostics --format json --task <task-id>
   ```
   The command prints the `run_id` plus the manifest path under `.runs/<task-id>/cli/<run-id>/manifest.json`.
2. Watch status:
   ```bash
   codex-orch status --run <run-id> --watch --interval 10
   ```
3. Resume if needed:
   ```bash
   codex-orch resume --run <run-id>
   ```
   > Tip: if you prefer `npx`, replace `codex-orch` with `npx @kbediako/codex-orchestrator`.
   > Tip: for multiple commands, you can also `export MCP_RUNNER_TASK_ID=<task-id>` once.

## Delegation MCP server

Run the delegation MCP server over stdio:
```bash
codex-orchestrator delegate-server --repo /path/to/repo
```
Optional: add `--mode question_only` to disable `delegate.spawn/pause/cancel`, keeping only `delegate.question.*` + `delegate.status` in the delegate namespace. GitHub tools remain available when GitHub integration is enabled.

Register it with Codex once. Delegation MCP is enabled by default (the only MCP enabled by default). If you’ve disabled it for a run, re-enable per run:
```bash
codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
codex -c 'mcp_servers.delegation.enabled=true' ...
```
`delegate-server` is the canonical name; `delegation-server` is supported as an alias (older docs may use it).

## Delegation + RLM flow

RLM (Recursive Language Model) is the long-horizon loop used by the `rlm` pipeline (`codex-orchestrator rlm "<goal>"` or `codex-orchestrator start rlm --goal "<goal>"`). Delegated runs only enter RLM when the child is launched with the `rlm` pipeline (or the rlm runner directly). In auto mode it resolves to symbolic when delegated, when `RLM_CONTEXT_PATH` is set, or when the context exceeds `RLM_SYMBOLIC_MIN_BYTES`; otherwise it stays iterative. The runner writes state to `.runs/<task-id>/cli/<run-id>/rlm/state.json` and stops when the validator passes or budgets are exhausted.

### Delegation flow
```mermaid
flowchart TB
  A["Parent run<br/>(delegation MCP enabled)"]
  C["Delegation MCP server"]
  D["delegate.spawn"]
  E["Child run<br/>(pipeline resolved)"]
  N{Pipeline = rlm?}
  P["Standard pipeline<br/>(plan/build/test/review)"]
  RLM["RLM pipeline<br/>(see next chart)"]

  A --> C --> D --> E --> N
  N -- yes --> RLM
  N -- no --> P
  E -. optional .-> Q["delegate.question.enqueue/poll"] -.-> A
```

### RLM loop
```mermaid
flowchart TB
  F["Resolve mode<br/>(auto -> iterative/symbolic)"]
  G{Symbolic?}
  H["Context store<br/>(chunk + search)"]
  I["Planner JSON<br/>(select subcalls)"]
  J["Subcalls<br/>(tool + edits)"]
  K["Validator<br/>(test command)"]
  L["State + artifacts<br/>.runs/&lt;task-id&gt;/cli/&lt;run-id&gt;/rlm/state.json"]
  M["Exit status"]

  F --> G
  G -- yes --> H --> I --> J --> K
  G -- no --> J
  J --> K
  K --> L --> M
  K -- fail & budget left --> F
```

## Skills (bundled)

The release ships skills under `skills/` for downstream packaging. If you already have global skills installed, treat those as the primary reference and use bundled skills as the shipped fallback. Install bundled skills into `$CODEX_HOME/skills`:
```bash
codex-orchestrator skills install
```

Options:
- `--force` overwrites existing files.
- `--codex-home <path>` targets a different Codex home directory.

Bundled skills (may vary by release):
- `delegation-usage`
- `standalone-review`
- `docs-first`

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
- `codex-orchestrator init codex` — install starter templates (`mcp-client.json`, `AGENTS.md`) into a repo.
- `codex-orchestrator self-check --format json` — JSON health payload.
- `codex-orchestrator mcp serve` — Codex MCP stdio server.

## What ships in the npm release

- CLI + built-in pipelines
- Delegation MCP server (`delegate-server`)
- Bundled skills under `skills/`
- Schemas and templates needed by the CLI

## Repository + contributor guide

Repo internals, development workflows, and deeper architecture notes live in the GitHub repository:
- `docs/README.md`
- `docs/diagnostics-prompt-guide.md` (first-run diagnostics prompt + expected outputs)
