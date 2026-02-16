# Cloud Mode Preflight + Fallback Guide

Cloud execution is optional. When requested, CO runs a short preflight and will fall back to `mcp` if the cloud environment is not wired.

## Running A Stage In Cloud Mode

Cloud mode is stage-scoped (use `--target`):
```bash
codex-orchestrator start <pipeline> --cloud --target <stage-id>
```

Typical wiring:
- `CODEX_CLOUD_ENV_ID`: required for cloud execution
- `CODEX_CLOUD_BRANCH`: optional, must exist on `origin` (remote)

Example:
```bash
export CODEX_CLOUD_ENV_ID="env_..."
export CODEX_CLOUD_BRANCH="main"
codex-orchestrator start diagnostics --cloud --target spec-guard
```

## Preflight Checks

Preflight validates:
- Cloud environment id is configured (`CODEX_CLOUD_ENV_ID` or `metadata.cloudEnvId`)
- Codex CLI is available (`codex --version`)
- If `CODEX_CLOUD_BRANCH` is set: `git` is available and `origin/<branch>` exists

## Fallback Behavior (No Cloud Wiring)

If preflight fails, CO:
1. Records a warning in `manifest.summary`
2. Falls back to `mcp` for the requested work
3. Surfaces the reason in `start` stdout under `Summary:` (and in `--format json` via `summary`)

This means repos without cloud setup can still run the same pipelines without extra configuration; cloud is a best-effort acceleration path.

## Common Fixes

- Missing env id:
  - Set `CODEX_CLOUD_ENV_ID` to a valid cloud environment id.
- Missing branch:
  - Push the branch to origin, or set `CODEX_CLOUD_BRANCH` to an existing remote branch.
- Codex CLI unavailable:
  - Install Codex CLI, or use CO’s managed/pinned Codex CLI setup (`codex-orchestrator codex setup`).

