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

## Downstream init (recommended)

Use this when you want Codex to drive work inside another repo with the CO defaults.

1. Install templates:
   ```bash
   codex-orchestrator init codex --cwd /path/to/repo
   ```
   One-shot (templates + CO-managed Codex CLI):
   ```bash
   codex-orchestrator init codex --codex-cli --yes
   ```
2. Register the delegation MCP server (one-time per machine):
   ```bash
   codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
   ```
3. Optional (collab JSONL parity): set up a CO-managed Codex CLI:
   ```bash
   codex-orchestrator codex setup
   ```
4. Optional (fast refresh helper for downstream users):
   ```bash
   scripts/codex-cli-refresh.sh --repo /path/to/codex
   ```
   Repo-only helper (not included in npm package). Set `CODEX_REPO` or `CODEX_CLI_SOURCE` to avoid passing `--repo` each time.

## Delegation MCP server

Run the delegation MCP server over stdio:
```bash
codex-orchestrator delegate-server --repo /path/to/repo
```
Optional: add `--mode question_only` to disable `delegate.spawn/pause/cancel`, keeping only `delegate.question.*` + `delegate.status` in the delegate namespace. GitHub tools remain available when GitHub integration is enabled.

Register it with Codex once. Delegation MCP is enabled by default (the only MCP enabled by default). To override the default or re-enable after disabling:
```bash
codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
codex -c 'mcp_servers.delegation.enabled=true' ...
```
`delegate-server` is the canonical name; `delegation-server` is supported as an alias (older docs may use it).

Delegation guard profile:
- `CODEX_ORCHESTRATOR_GUARD_PROFILE=auto` (default): strict in CO-style repos, warn in lightweight repos.
- Set `CODEX_ORCHESTRATOR_GUARD_PROFILE=warn` for ad-hoc/no-task-id runs.
- Set `CODEX_ORCHESTRATOR_GUARD_PROFILE=strict` to enforce full delegation evidence checks.

## Delegation + RLM flow

RLM (Recursive Language Model) is the long-horizon loop used by the `rlm` pipeline (`codex-orchestrator rlm "<goal>"` or `codex-orchestrator start rlm --goal "<goal>"`). Delegated runs only enter RLM when the child is launched with the `rlm` pipeline (or the rlm runner directly). In auto mode it resolves to symbolic when delegated, when `RLM_CONTEXT_PATH` is set, or when the context exceeds `RLM_SYMBOLIC_MIN_BYTES`; otherwise it stays iterative. The runner writes state to `.runs/<task-id>/cli/<run-id>/rlm/state.json` and stops when the validator passes or budgets are exhausted.
Symbolic subcalls can optionally use collab tools when `RLM_SYMBOLIC_COLLAB=1` (requires a collab-enabled Codex CLI via `codex-orchestrator codex setup`). Collab tool calls parsed from `codex exec --json --enable collab` are stored in `manifest.collab_tool_calls` (bounded by `CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS`, set to `0` to disable).

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
  J["Subcalls<br/>(tool + edits, collab optional)"]
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
- `collab-evals`
- `collab-deliberation`
- `delegate-early` (compatibility alias; use `delegation-usage`)

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
- `codex-orchestrator init codex --codex-cli --yes --codex-source <path>` — also provision a CO-managed Codex CLI binary (build-from-source default; set `CODEX_CLI_SOURCE` to avoid passing `--codex-source` every time).
- `codex-orchestrator init codex --codex-cli --yes --codex-download-url <url> --codex-download-sha256 <sha>` — opt-in to a prebuilt Codex CLI download.
- `codex-orchestrator codex setup` — plan/apply a CO-managed Codex CLI install (for collab JSONL parity; use `--download-url` + `--download-sha256` for prebuilts).
- `codex-orchestrator self-check --format json` — JSON health payload.
- `codex-orchestrator mcp serve` — Codex MCP stdio server.

## What ships in the npm release

- CLI + built-in pipelines
- Delegation MCP server (`delegate-server`)
- Bundled skills under `skills/`
- Schemas and templates needed by the CLI

## Repository + contributor guide

Repo internals, development workflows, and deeper architecture notes (contributor/internal) live in the GitHub repository:
- `docs/README.md`
- `docs/diagnostics-prompt-guide.md` (first-run diagnostics prompt + expected outputs)
- `docs/guides/collab-vs-mcp.md` (agent-first decision guide)

## RLM benchmark graphs

Seeded OOLONG accuracy curves (Wilson 95% CI, runs=5). In these runs, the baseline accuracy degrades as context length grows, while RLM stays near the ceiling across the tested lengths.

<table>
  <tr>
    <td><img src="docs/assets/oolong-baseline-seeded-wilson95-runs5.png" alt="Baseline OOLONG seeded Wilson 95% CI" width="420"></td>
    <td><img src="docs/assets/oolong-rlm-seeded-wilson95-runs5.png" alt="RLM OOLONG seeded Wilson 95% CI" width="420"></td>
  </tr>
</table>
