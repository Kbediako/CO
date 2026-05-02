# Codex Orchestrator

Codex Orchestrator (CO) is a CLI and runtime for Codex-driven pipelines, auditable manifests, delegation workflows, and downstream repo bootstrapping.

## Release Posture

This README tracks the current `main` branch. Published-package users should follow the README and docs for the tag or release they installed.

- Latest package docs: [GitHub releases](https://github.com/Kbediako/CO/releases/latest)
- Older `v0.2.0` package docs: [README for `v0.2.0`](https://github.com/Kbediako/CO/blob/v0.2.0/README.md)
- Detailed source-head docs: [docs/book/README.md](docs/book/README.md)

## Install

```bash
npm i -g @kbediako/codex-orchestrator
codex-orchestrator --version
```

Node.js `>=20` is required. npm remains the supported baseline install path.

## Current Posture

- Current CO-local Codex CLI `0.128.0` ChatGPT-auth/appserver posture
- Current model posture: `gpt-5.5` / `xhigh` when available in ChatGPT-auth Codex sessions
- Portable packaged/generated defaults keep `gpt-5.4` / `xhigh` as fallback values when `gpt-5.5`, API, or cloud portability is unavailable
- Local default runtime: `appserver`
- Unsupported combination: `executionMode=cloud` with explicit `runtimeMode=appserver`

The full version and model policy lives in [docs/guides/codex-version-policy.md](docs/guides/codex-version-policy.md).

## Quickstart

```bash
codex-orchestrator init codex --cwd /path/to/repo
cd /path/to/repo
codex-orchestrator setup --yes --repo /path/to/repo
codex login
codex-orchestrator flow --task <task-id>
codex-orchestrator doctor --format json
```

Use `codex login --device-auth` when browser login is not available.

## Plugin Install

The npm CLI install is the baseline. Codex plugin marketplace setup is additive for Codex releases that expose plugin flows. Current local Codex CLI `0.128.0` keeps marketplace management under `codex plugin marketplace ...`, while release-facing smoke workflow pins intentionally hold on the version policy target:

```bash
# Codex 0.121.0 accepts either command.
codex marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"

# Codex 0.122.0+ uses the plugin command.
codex plugin marketplace add "$(npm root -g)/@kbediako/codex-orchestrator"
```

For local checkout installs, pass the repository root instead of the npm install directory. For Git-backed installs, pass `owner/repo[@ref]`, an HTTPS Git URL, or an SSH Git URL. Use `codex plugin marketplace upgrade codex-orchestrator` to refresh a Git-backed marketplace checkout and `codex plugin marketplace remove codex-orchestrator` to remove the marketplace registration. Then open `/plugins` in Codex, install `Codex Orchestrator`, and restart Codex if the plugin is not picked up immediately. More local checkout, Git-backed, and rollback details are in [docs/book/setup.md](docs/book/setup.md).

## Common Commands

```bash
codex-orchestrator flow --task <task-id>
codex-orchestrator start diagnostics --task <task-id> --format json
codex-orchestrator status --run <run-id> --watch --interval 10
codex-orchestrator review
codex-orchestrator linear issue-context --issue-id <linear-uuid>
```

Run artifacts live under `.runs/<task-id>/` and summaries under `out/<task-id>/`.

## Downstream Setup

- [Book index](docs/book/README.md): setup, operations, skills, public posture, and historical release evidence notes
- [Bundled skills](skills/README.md): shipped skill roster and install behavior
- [Downstream setup](docs/public/downstream-setup.md): install, repo bootstrap, machine setup, and first run
- [Provider onboarding](docs/public/provider-onboarding.md): Linear and provider-worker setup
- [Docs index](docs/README.md): repo-local documentation map

## Contributing

Contributor and repo-internal guidance lives in [docs/README.md](docs/README.md).
