---
id: 20260409-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee
title: CO: ship installable local control-host supervision instead of host-local co-control-host-supervisor.sh
relates_to: docs/PRD-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`
- PRD: `docs/PRD-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`
- Task checklist: `tasks/tasks-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`

## Traceability
- Linear issue: `CO-117` / `0b606d2f-d31c-40a0-8709-e0aec86396ee`
- Linear URL: https://linear.app/asabeko/issue/CO-117/co-ship-installable-local-control-host-supervision-instead-of-host
- Current host-local baseline:
  - `/Users/kbediako/.local/bin/co-control-host-supervisor.sh`
  - `/Users/kbediako/Library/LaunchAgents/com.kbediako.co.control-host.plist`

## Summary
- Objective: replace the current host-local `control-host` supervision wrapper with a supported macOS launchd command family in the packaged CO CLI.
- Scope:
  - add a launchd-first supervision surface with `install`, `uninstall`, `status`, `restart`, and internal `run`
  - generate machine-local config and LaunchAgent artifacts from configurable inputs instead of hard-coded absolute paths
  - preserve env/bootstrap sourcing, explicit runtime selection, health polling, and bounded unhealthy restarts
  - expose failure and restart reasons through logs and status-readable state
- Constraints:
  - keep scope limited to root `control-host` uptime and health
  - do not mix queue-management or merge-policy logic into the supervision lane
  - macOS only in this first slice

## Implementation Boundary
- Command surface:
  - keep `control-host` start behavior intact
  - add nested supervision subcommands, likely `codex-orchestrator control-host supervise <subcommand>`
  - `run` is an internal long-lived runner suitable for launchd `ProgramArguments`
- Install contract:
  - persist a supervision config under a user-local support path
  - render a LaunchAgent plist from config plus current runtime defaults
  - default install-time executable path to `process.execPath` and current CLI entrypoint or package root discovery
  - allow overrides for repo root, Node executable, task, run, pipeline, health interval, unhealthy threshold, env/bootstrap files, label, and log directory
- Runtime contract:
  - launch the child `control-host` under a shell-owned bootstrap step so existing shell env files remain source-compatible
  - poll `co-status --format json` on the configured cadence
  - count consecutive `restart_required` samples and exit with a restart-friendly code once the threshold is hit
  - update a local status/state file with timestamps and reasons for launch, unhealthy restarts, and child exits
- Status contract:
  - inspect persisted install config, state file, LaunchAgent presence, and launchctl status
  - optionally include bounded `co-status` or child-health details when available without mutating state
- Uninstall or restart:
  - use `launchctl` to boot out or bootstrap or kickstart the label
  - remove generated local artifacts only when the command owns them

## Design
- New modules:
  - a new CLI parser under the existing `orchestrator/src/cli/` command family for supervision subcommands
  - a new helper module under the existing `orchestrator/src/cli/control/` directory for config rendering, launchd interaction, runtime loop, and state persistence
- Config model:
  - install root, label, repo root, node path, cli entrypoint or package root, task, run, pipeline
  - health interval seconds, unhealthy threshold count, env file list, bootstrap shell path, log paths
  - state file path with last child start, last child exit, last unhealthy restart reason, and latest observed `co-status` summary
- Launchd model:
  - LaunchAgent `ProgramArguments` should invoke the packaged CLI plus supervision `run` command rather than a copied one-off host script
  - `WorkingDirectory` should come from the configured repo root
  - `StandardOutPath` and `StandardErrorPath` should land in a predictable user-local log root
- Guardrails:
  - validate required executable and path inputs at install time
  - fail closed with machine-readable errors when launchctl or filesystem mutation fails
  - keep supervision separate from provider selection or review state mutation

## Validation
- `linear child-stream --pipeline docs-review`
- Focused regressions in:
  - top-level CLI help or command parsing for `control-host supervise`
  - supervision install or plist rendering
  - supervision runtime loop health polling and restart threshold behavior
  - launchctl interaction helpers with dependency injection
  - status output and persisted restart-reason state
- Full repo validation floor before review handoff
- `npm run pack:smoke` because the diff changes downstream CLI behavior

## Approvals
- Reviewer: pending audited `codex-orchestrator docs-review` child stream for the CO-117 packet
- Date: 2026-04-09
