# Codex Orchestrator

Codex Orchestrator is a CLI and runtime for Codex-driven pipelines, auditable manifests, delegation MCP workflows, and downstream repo bootstrapping.

## Release posture

This README tracks the current `main` branch. In this checkout, `package.json` still reports `0.1.38` and the latest local tag is `v0.1.38`, so some setup guidance below is newer than the latest tagged and published package.

- Release-safe docs for the published package: [README for `v0.1.38`](https://github.com/Kbediako/CO/blob/v0.1.38/README.md)
- Source-head-only guidance in this checkout: the marketplace/plugin flow below plus the new `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md` guides

## Install

npm remains the supported baseline because it is the simplest way to install the CO CLI.

```bash
npm i -g @kbediako/codex-orchestrator
codex-orchestrator --version
```

Node.js `>=20` is required.

CO currently targets Codex CLI `0.123.0`; newer candidates stay evidence-gated in `docs/guides/codex-version-policy.md`.
The source-head marketplace/plugin guidance keeps the CO-196 packaging boundary: npm remains the release-safe baseline, while Codex plugin marketplace registration is an additive path for newer Codex CLI command surfaces.

### Source-head marketplace/plugin setup

The marketplace/plugin flow below reflects the current source tree and is newer than the latest tagged `v0.1.38` package. Published-package users, and anyone pinned to `v0.1.38`, should keep following the tagged README above. Only use the marketplace/plugin steps below when you are on `main` or on a newer tag or release that already includes `plugins/codex-orchestrator` and the related public docs.

For newer Codex releases that expose `codex plugin marketplace`, CO also ships a repo marketplace entry plus plugin manifests under `plugins/codex-orchestrator`. You can add the packaged or repo-root marketplace source and install the plugin from Codex:

```bash
codex plugin marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"
```

For a local checkout, add the repository root instead of the npm install directory. For a Git-backed install, pass a Git identifier or URL such as `owner/repo[@ref]`, an HTTPS Git URL, or an SSH Git URL. Those source-driven installs can include unreleased changes; pinning `v0.1.38` keeps you on the older pre-marketplace behavior, so use the steps below only on `main` or on a newer ref that already contains the plugin manifests and public docs mentioned here. The marketplace entry points at the packaged `plugins/codex-orchestrator` directory, and the installed plugin uses a small `node` launcher to resolve the marketplace runtime root from `${CODEX_HOME:-~/.codex}/config.toml`: local-directory sources run from the recorded source path, while Git-backed sources run from Codex's installed checkout under `${CODEX_HOME:-~/.codex}/.tmp/marketplaces/codex-orchestrator`. That keeps the MCP registration path independent of a second `codex-orchestrator` PATH entry. If you move or replace a local-directory source, or remove Codex's installed marketplace checkout, re-run `codex plugin marketplace add ...` before using the plugin again. Then open `/plugins` in Codex, install `Codex Orchestrator`, and restart Codex if it does not pick up the plugin immediately. Use the plugin browser's uninstall action to remove the plugin, `codex plugin marketplace remove codex-orchestrator` to remove the marketplace registration, or set the plugin entry in `${CODEX_HOME:-~/.codex}/config.toml` to `enabled = false` to turn it off without uninstalling.

## 2-minute quickstart (current `main`)

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

These guides are current source-head docs in this checkout. They were added after `v0.1.38`, so published-package users and anyone pinned to `v0.1.38` should treat them as source-head-only unless they are reading a matching newer tag or source ref that already includes these files.

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

- Current Codex CLI target: `0.123.0`
- Current model posture: `gpt-5.4`
- `explorer_fast` remains the explicit `gpt-5.3-codex-spark` file/codebase search-only exception
- Local default runtime: `appserver`
- `executionMode=cloud` with explicit `runtimeMode=appserver` remains unsupported

## Contributing

Contributor and repo-internal guidance lives in the source repository:
[docs/README.md](https://github.com/Kbediako/CO/blob/main/docs/README.md).
