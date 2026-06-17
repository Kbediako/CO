# Provider Onboarding

This guide is the downstream-safe provider contract for Linear and Telegram.

Reviewed 2026-06-17: local smoke on Codex CLI `0.140.0` still exposes the provider-facing `doctor`, `control-host`, `co-status`, and `control-host supervise` surfaces used below, so the onboarding flow remains current. This smoke note is not a posture promotion; canonical version posture remains governed by `docs/guides/codex-version-policy.md`.

## Contract

- Once per machine: install CO, authenticate Codex, and confirm `codex-orchestrator doctor --format json` works.
- Once per repo: seed `.codex/providers/` with `codex-orchestrator init codex`.
- Runtime env carries secrets and provider bindings.
- Control policy carries `dispatch_pilot` and `transport_mutating_controls`.
- Linear and Telegram should both have a machine-checkable readiness signal before live smoke.

## Generated scaffolding

`codex-orchestrator init codex` seeds:

- `.codex/providers/README.md`
- `.codex/providers/provider.env.example`
- `.codex/providers/control.example.json`

Use those files as the starting point for your repo-specific provider setup.

## Environment variables

Recommended Linear env:

- `CO_LINEAR_API_TOKEN`
- `CO_LINEAR_WORKSPACE_ID`
- `CO_LINEAR_TEAM_ID`
- `CO_LINEAR_PROJECT_ID`
- `CO_LINEAR_WEBHOOK_SECRET`

Supported Linear token fallbacks:

- `CO_LINEAR_API_KEY`
- `LINEAR_API_KEY`

Telegram env:

- `CO_TELEGRAM_POLLING_ENABLED`
- `CO_TELEGRAM_BOT_TOKEN`
- `CO_TELEGRAM_ALLOWED_CHAT_IDS`
- `CO_TELEGRAM_ENABLE_MUTATIONS`
- `CO_TELEGRAM_POLL_INTERVAL_MS`
- `CO_TELEGRAM_PUSH_ENABLED`
- `CO_TELEGRAM_PUSH_INTERVAL_MS`

## Control policy

Keep the provider policy explicit.

`dispatch_pilot` should declare a Linear source and stay advisory-first:

```json
{
  "feature_toggles": {
    "dispatch_pilot": {
      "enabled": true,
      "source": {
        "provider": "linear",
        "live": true,
        "workspace_id": "workspace-id",
        "team_id": "team-id",
        "project_id": "project-id"
      }
    }
  }
}
```

Telegram mutation policy should be explicit too:

```json
{
  "feature_toggles": {
    "transport_mutating_controls": {
      "enabled": true,
      "allowed_transports": ["telegram"]
    }
  }
}
```

Nested `coordinator.dispatch_pilot` and `coordinator.transport_mutating_controls` remain valid compatibility paths.

## Readiness

`codex-orchestrator doctor --format json` is the machine-checkable readiness surface.

Expect it to tell you:

- whether delegation and DevTools wiring are present
- whether Linear credentials and binding env are populated
- whether `CO_LINEAR_WEBHOOK_SECRET` is present
- whether Telegram polling, token, and allowlist env are populated
- whether repo scaffolding under `.codex/providers/` exists

## Smoke flow

Use this minimal smoke flow:

1. Check readiness:
   ```bash
   codex-orchestrator doctor --format json
   ```
2. Start the host in a dedicated terminal and keep it running:
   ```bash
   codex-orchestrator control-host --format json
   ```
   This prints a startup readiness payload and then keeps the host alive.
3. In another terminal, inspect the current status snapshot:
   ```bash
   codex-orchestrator co-status --format json
   ```
4. Telegram read-only smoke:
   - send `/help` from an allowlisted chat
   - confirm the bot replies
5. Linear advisory smoke:
   - confirm the status snapshot reaches `dispatch_pilot.status=ready`
   - confirm the selected tracked issue resolves from the configured workspace, team, or project binding

## Provider-worker runtime authority

Provider-driven Linear workers should be launched or recovered through the running root control host, including `codex-orchestrator control-host recover`, `codex-orchestrator control-host relaunch`, or `codex-orchestrator control-host nudge` for targeted issue operations. Direct `start provider-linear-worker` remains unsupported because it bypasses control-host admission, launch-token, provenance, deterministic issue worktree, and root `.runs` and `out` artifact routing.

When runtime selection resolves to `appserver`, the resident app-server JSONL control seam is the authoritative worker-control plane. `codex exec` / `codex exec resume` remain available only as explicit break-glass or legacy CLI fallback paths when app-server authority is unavailable or intentionally bypassed. Use the worker manifest/runtime proof and `co-status --format json` to confirm which runtime provider owned a run.

## Help surfaces

Use these commands when onboarding an operator:

```bash
codex-orchestrator doctor --help
codex-orchestrator control-host --help
codex-orchestrator co-status --help
```

`control-host --format json` is a persistent host startup handshake, not a one-shot status dump.

## macOS launchd supervision

On macOS, use the shipped supervision surface instead of a copied local shell wrapper:

1. Make sure the `codex-orchestrator` currently on `PATH` is current enough to expose `control-host supervise`:
   - source-checkout operator: from the checkout root, run `npm link` so the active `codex-orchestrator` bin points at this checkout's `bin/codex-orchestrator.js`
   - packaged/global install operator: upgrade the active package (for example `npm install -g @kbediako/codex-orchestrator@latest`) before attempting the migration
   - verify the active CLI with:
   ```bash
   codex-orchestrator control-host supervise status --format json
   ```
   If the current machine is still on the legacy shim rollout, the JSON status now reports that rollout mode and that migration is still required.
2. Install the LaunchAgent-backed supervisor from the repo root:
   ```bash
   codex-orchestrator control-host supervise install --format json
   ```
   This rewrites the existing `com.kbediako.co.control-host` LaunchAgent in place, replacing the legacy shim rollout when present, and records the active package's `bin/codex-orchestrator.js` bootstrap as the managed entrypoint.
3. Inspect the current launchd, rollout mode, config, and restart-reason state:
   ```bash
   codex-orchestrator control-host supervise status --format json
   ```
4. Restart the supervised host after config or env changes:
   ```bash
   codex-orchestrator control-host supervise restart --format json
   ```
   The restart payload records the previously tracked supervised child pid (`previous_child_pid`), the newly observed supervised child pid when available (`child_pid`), and `cleanup.result`. If launchd leaves the old supervised tree alive, the payload fails closed unless CO can force-clean that exact stale control-host process group first; any forced cleanup also records the orphaned process-group and descendant pids in `cleanup`.
5. Remove the generated LaunchAgent, config, state, and logs:
   ```bash
   codex-orchestrator control-host supervise uninstall --format json
   ```

`control-host supervise status --format json` is the machine-checkable operator surface for whether the LaunchAgent is still on the legacy shim rollout or the managed packaged rollout, whether migration is still required, whether launchd is loaded, which supervised control-host child pid is currently recorded, and what last restart reason or health state the supervisor recorded.

When a replacement host encounters an already-running owner during a restart race, inspect:

```bash
codex-orchestrator co-status --format json
```

The `polling.control_host_owner` payload carries the duplicate/stale owner diagnostic path plus owner pid/token metadata. Treat that owner diagnostic as control-host evidence, not as a provider-worker list: detached `provider-linear-worker` issue processes run independently in their own issue workspaces and are not the restart cleanup target.
