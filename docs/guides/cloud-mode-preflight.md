# Cloud Mode Preflight + Fallback Guide

Cloud execution is optional. When requested, CO runs a short preflight and will fall back to `mcp` if the cloud environment is not wired.

## Running A Stage In Cloud Mode

Cloud mode is stage-scoped (use `--target`):
```bash
codex-orchestrator start <pipeline> --cloud --target <stage-id>
```

Runtime compatibility:
- `executionMode` and `runtimeMode` are orthogonal controls.
- Local default runtime is `appserver`; `--runtime-mode cli` remains break-glass.
- `--execution-mode cloud --runtime-mode appserver` is unsupported and fails fast.
- Non-explicit cloud runs that inherit the local `appserver` default may still auto-reroute to
  `runtimeMode=cli` under the runtime fallback policy. That bridge is an expiring CO-396
  compatibility path: manifests must keep the full `runtime_fallback.expiry` contract
  (`owner`, `trigger`, `introduced_date`, `review_date`, `maximum_lifetime`,
  `removal_condition`, and `validation`) with `owner=CO-396`, `review_date=2026-05-10`,
  and `maximum_lifetime=2026-05-26` until the cloud route selects `cli` before runtime
  selection or fails fast with equivalent metadata. See
  `docs/guides/fallback-expiry-and-refactor-policy.md` before changing the contract.
- Cloud lanes should request `--runtime-mode cli` explicitly when deterministic contract testing is required.
- Codex CLI `0.128.0` removed `js_repl` and `js_repl_tools_only`; do not set `CODEX_CLOUD_ENABLE_FEATURES=js_repl`, `CODEX_CLOUD_DISABLE_FEATURES=js_repl`, or run `codex features enable/disable js_repl`.
- Keep enabled/disabled lanes separate for active non-removed features only (do not set the same feature in both lists for one run).
- Check `codex features list` in version-audit lanes before naming feature flags in cloud contracts.

Typical wiring:
- `CODEX_CLOUD_ENV_ID`: required for cloud execution
- `CODEX_CLOUD_BRANCH`: optional, must exist on `origin` (remote)
- `CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES`: optional, use only for explicit cloud feature-contract lanes whose feature names are active in the target Codex CLI

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
- When an environment id is configured: `codex cloud list --env <id> --limit 1 --json` can see the environment before any `codex cloud exec` task submission is attempted
- If `CODEX_CLOUD_BRANCH` is set: `git` is available and `origin/<branch>` exists

Run the same checks directly without starting a pipeline:
```bash
codex-orchestrator doctor --cloud-preflight
codex-orchestrator doctor --cloud-preflight --format json
```

`doctor --cloud-preflight` also reports local-only sandbox/security advisories, currently top-level `sandbox_mode = "danger-full-access"` and WSL1 bubblewrap posture, without converting those advisories into cloud blockers.

## Codex 0.121 Sandbox/Security Classification

CO-199 classifies the `rust-v0.121.0` sandbox/security release deltas before any promotion of `0.121.0` from candidate to active CO target. The classification keeps local platform posture, cloud preflight blockers, and shared metadata surfaces separate.

| Codex 0.121 delta / surface | CO preflight class | Policy outcome |
| --- | --- | --- |
| Secure devcontainer behavior | local-only | Treat as local development/container posture. Cloud adoption still requires explicit `CODEX_CLOUD_ENV_ID` canary evidence. |
| macOS private DNS handling | local-only | Document as local macOS sandbox/proxy behavior; never use it as cloud readiness evidence. |
| macOS Unix socket handling | local-only | Keep Unix socket allowlist behavior scoped to local macOS/app-server paths. |
| Windows elevated denial | local-only | Elevated Windows sessions are unsupported local operator posture, not a cloud blocker. |
| WSL1 bubblewrap behavior | local-only | `doctor --cloud-preflight` reports a local-only WSL1 bubblewrap advisory when detectable; WSL2/Linux remains the local replacement path. |
| exec-server filesystem sandboxing | local-only | Applies to local app-server/exec-server filesystem handling. Provider workers stay on current `codex exec` / `resume` supervision. |
| Remote exec environment policy | cloud-only | Cloud lanes must keep remote execution policy behind cloud preflight and canary evidence. |
| Websocket token hash auth | local-only | Applies to local app-server/control surfaces. `--execution-mode cloud --runtime-mode appserver` remains unsupported and fails fast. |
| Pinned inputs | not applicable | Treat as release/build hygiene unless a future lane identifies a CO preflight dependency. |
| `danger-full-access` behavior | local-only | `doctor --cloud-preflight` reports top-level `sandbox_mode = "danger-full-access"` as a local-only advisory; CO must not weaken defaults to restore removed behavior. |
| `thread/shellCommand` sensitive surface | local-only | Keep out of the default provider-worker authority model unless a future cloud-bridge lane proves otherwise. |
| MCP sandbox-state metadata | both | Metadata may be documented or consumed on local/cloud MCP surfaces, but it does not expand tool authority or replace cloud canary evidence. |

## Fallback Behavior (No Cloud Wiring)

Cloud fallback is explicit. With the default `CODEX_ORCHESTRATOR_CLOUD_FALLBACK=auto` policy, if preflight fails, CO:
1. Records a warning in `manifest.summary`
2. Writes a structured fallback block at `manifest.cloud_fallback` with `policy`, `policy_source`, `original_target`, `fallback_target`, `blocking_reason`, issue codes/messages, and timestamp
3. Reroutes to `mcp` for the requested work
4. Surfaces the selected policy, original target, fallback target, and blocking reason in `start` stdout as `Cloud fallback: ...` and in JSON output under `cloud_fallback`
5. Surfaces current fallback policy in `doctor` output (`fallback policy: auto|strict`)

This means repos without cloud setup can still run the same pipelines without extra configuration when auto policy is selected, while still leaving machine-readable evidence of the reroute.

Cloud fallback evidence is not required-cloud evidence. The fallback contract writes
`manifest.cloud_fallback` and proves the local MCP fallback path only; it does not satisfy a
required cloud execution gate. Runtime routing fallback evidence remains separate in
`manifest.runtime_fallback`, including CO-396 expiry metadata for retained temporary runtime reroutes.

## Fail-Fast Cloud Mode (Strict)

For cloud-focused lanes, avoid relying on fallback and fail fast on preflight issues:

```bash
export CODEX_ORCHESTRATOR_CLOUD_FALLBACK=strict
```

Accepted strict aliases: `strict`, `deny`, `denied`, `false`, `0`, `off`, `disabled`, `never`.
Accepted auto aliases: `auto`, `allow`, `allowed`, `true`, `yes`, `1`, `on`, `enabled`.
When strict is selected, cloud preflight failures stop the run with `status_detail=cloud-preflight-failed` and include the policy, original target, fallback target, and blocking reason in the failure detail.

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
- Environment not found / inaccessible:
  - Run `codex cloud` with the active account and set `CODEX_CLOUD_ENV_ID` to an environment visible to that account before required cloud canaries or promotion gates.
- Missing branch:
  - Push the branch to origin, or set `CODEX_CLOUD_BRANCH` to an existing remote branch.
- Codex CLI unavailable:
  - Install Codex CLI, or use CO’s managed/pinned Codex CLI setup (`codex-orchestrator codex setup` + `CODEX_CLI_USE_MANAGED=1`).
