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

Run the same checks directly without starting a pipeline:
```bash
codex-orchestrator doctor --cloud-preflight
codex-orchestrator doctor --cloud-preflight --format json
```

## Fallback Behavior (No Cloud Wiring)

If preflight fails, CO:
1. Records a warning in `manifest.summary`
2. Writes a structured fallback block at `manifest.cloud_fallback` (reason + issue codes/messages + timestamp)
3. Falls back to `mcp` for the requested work
4. Surfaces the reason in `start` stdout as `Cloud fallback: ...` (and in `--format json` via `cloud_fallback_reason`)
5. Surfaces current fallback policy in `doctor` output (`fallback policy: allow|deny`)

This means repos without cloud setup can still run the same pipelines without extra configuration; cloud is a best-effort acceleration path.

## Fail-Fast Cloud Mode (No Fallback)

For cloud-focused lanes, avoid relying on fallback and fail fast on preflight issues:

```bash
export CODEX_ORCHESTRATOR_CLOUD_FALLBACK=deny
```

Accepted deny values: `deny`, `strict`, `false`, `0`, `off`, `disabled`, `never`.
When set, cloud preflight failures stop the run with `status_detail=cloud-preflight-failed`.

## Observability + Issue Logging

- During cloud execution, `manifest.cloud_execution` is populated incrementally (task id/status/status URL) while runs are still in progress.
- `codex-orchestrator status --run <run-id> --format json` returns `cloud_execution` and `cloud_fallback` blocks for live monitoring.
- For reproducible downstream bug reports, run:
  - `codex-orchestrator doctor --issue-log --issue-title "<title>" --issue-notes "<notes>"`
  - This appends `docs/codex-orchestrator-issues.md` and writes a JSON bundle under `out/<resolved-task>/doctor/issue-bundles/` (latest run context included when available).

## Status Poll Resilience Knobs

Cloud task status polling keeps safe defaults and can be tuned when needed:
- `CODEX_CLOUD_STATUS_RETRY_LIMIT` (default `12`)
- `CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS` (default `1500`)

Example:
```bash
export CODEX_CLOUD_STATUS_RETRY_LIMIT=20
export CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS=1000
codex-orchestrator start diagnostics --cloud --target spec-guard
```

## Common Fixes

- Missing env id:
  - Set `CODEX_CLOUD_ENV_ID` to a valid cloud environment id.
- Missing branch:
  - Push the branch to origin, or set `CODEX_CLOUD_BRANCH` to an existing remote branch.
- Codex CLI unavailable:
  - Install Codex CLI, or use CO’s managed/pinned Codex CLI setup (`codex-orchestrator codex setup` + `CODEX_CLI_USE_MANAGED=1`).
