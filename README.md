# Codex Orchestrator

Codex Orchestrator is a CLI and runtime for Codex-driven pipelines, auditable manifests, delegation MCP workflows, and downstream repo bootstrapping.

## Install

```bash
npm i -g @kbediako/codex-orchestrator
codex-orchestrator --version
```

Node.js `>=20` is required.

CO currently targets Codex CLI `0.118.0`.

## 2-minute quickstart

1. Install the downstream repo templates:
   ```bash
   codex-orchestrator init codex --cwd /path/to/repo
   ```
2. Configure bundled skills plus delegation and DevTools wiring once per machine:
   ```bash
   codex-orchestrator setup --yes
   ```
3. Log in to Codex. If browser login is not available, use device auth:
   ```bash
   codex login
   # Fallback
   codex login --device-auth
   ```
4. Run the default docs-first flow inside your repo:
   ```bash
   codex-orchestrator flow --task <task-id>
   ```
5. Check local readiness:
   ```bash
   codex-orchestrator doctor --format json
   ```

## Downstream setup

Public downstream docs shipped in the npm package:

- [docs/public/downstream-setup.md](docs/public/downstream-setup.md): install, repo bootstrap, machine setup, and first-run flow
- [docs/public/provider-onboarding.md](docs/public/provider-onboarding.md): Linear and Telegram onboarding, env vars, policy examples, readiness, and smoke flow

`init codex` also seeds provider examples under `.codex/providers/` so fresh repos do not need to hand-author the first env and policy files from scratch.

## Common commands

```bash
codex-orchestrator flow --task <task-id>
codex-orchestrator review --task <task-id>
codex-orchestrator doctor --usage --window-days 30
codex-orchestrator start diagnostics --task <task-id> --format json
codex-orchestrator co-status
codex-orchestrator control-host supervise status --format json
```

## Skills (bundled)

Install bundled skills into `$CODEX_HOME/skills`:

```bash
codex-orchestrator skills install
```

Bundled skills:

- `agent-first-adoption-steering`
- `chrome-devtools`
- `codex-orchestrator`
- `collab-deliberation`
- `collab-evals`
- `collab-subagents-first`
- `delegate-early`
- `delegation-usage`
- `docs-first`
- `elegance-review`
- `land`
- `linear`
- `long-poll-wait`
- `release`
- `standalone-review`

## Public posture

- Current Codex CLI target: `0.118.0`
- Current model posture: `gpt-5.4`
- `explorer_fast` remains the explicit `gpt-5.3-codex-spark` exception
- Local default runtime: `appserver`
- `executionMode=cloud` with explicit `runtimeMode=appserver` remains unsupported

## Contributing

Contributor and repo-internal guidance lives in the source repository:
[docs/README.md](https://github.com/Kbediako/CO/blob/main/docs/README.md).
