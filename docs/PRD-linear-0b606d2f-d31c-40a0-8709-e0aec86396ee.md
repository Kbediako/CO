# PRD - CO: ship installable local control-host supervision instead of host-local co-control-host-supervisor.sh

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-117` / `0b606d2f-d31c-40a0-8709-e0aec86396ee`
- Linear URL: https://linear.app/asabeko/issue/CO-117/co-ship-installable-local-control-host-supervision-instead-of-host
- Current host-local baseline:
  - supervisor script: `/Users/kbediako/.local/bin/co-control-host-supervisor.sh`
  - LaunchAgent: `/Users/kbediako/Library/LaunchAgents/com.kbediako.co.control-host.plist`

## Summary
- Problem Statement: CO currently depends on one host-local zsh helper plus one host-local LaunchAgent to keep the root `control-host` alive under launchd. That wrapper is operationally useful, but it is outside the repo, hard-codes one machine's repo path and Homebrew Node path, and is not part of the shipped CLI or package surface.
- Desired Outcome: ship a repo-tracked, installable macOS supervision path for the root `control-host` that keeps the current useful behavior, stays configurable instead of hard-coded, and exposes install or uninstall or status or restart flows plus restart reasons through supported CO commands.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): turn the currently ad hoc local `co-control-host-supervisor.sh` plus LaunchAgent setup into a supported CO feature. The new path should preserve the narrow root-host uptime contract, keep local env/bootstrap parity, use an explicit runtime, poll health, and restart after repeated unhealthy samples, without mixing in queue management or merge policy.
- Success criteria / acceptance:
  - CO ships a supported way to install and manage local `control-host` supervision on macOS
  - the shipped surface does not depend on a specific user home, repo path, or Homebrew Node path
  - the current useful behavior stays intact: source local env/bootstrap files, start the root `control-host`, poll health, and restart after repeated unhealthy samples
  - install or uninstall or status or restart flows are documented and machine-checkable
  - failure and restart reasons are visible in logs or status output instead of only as opaque launchd restarts
  - the supervision contract stays separate from queue-management or merge-orchestration policy
- Constraints / non-goals:
  - macOS launchd first; do not require non-macOS service managers in this slice
  - do not reopen child runtime PATH parity work from `CO-115`
  - do not broaden into autonomous queue shepherding or merge policy

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `installable local control-host supervision`
  - `host-local co-control-host-supervisor.sh`
  - `source local provider env/bootstrap files`
  - `poll health`
  - `restart after repeated unhealthy samples`
  - `install, uninstall, status, and restart ergonomics`
  - `separate from queue-management and merge-orchestration policy`
- Protected terms / exact artifact and surface names:
  - `control-host`
  - `co-status`
  - `provider-linear-worker`
  - `launchd`
  - `LaunchAgent`
  - `restart_required`
  - `co-control-host-supervisor.sh`
  - `com.kbediako.co.control-host.plist`
- Nearby wrong interpretations to reject:
  - "this should be folded into queue-management or merge-orchestration behavior"
  - "the fix is just to commit one hard-coded host script into the repo"
  - "we only need a README, not a shipped CLI surface"
  - "launchd uptime means the worker should also start or stop issues automatically"
  - "this slice should include Linux systemd or other service managers now"

## Parity / Alignment Matrix
- Current truth:
  - the root `control-host` uptime contract exists only through one local zsh wrapper plus one user LaunchAgent outside the repo
  - the wrapper hard-codes repo root, Node executable, task or run or pipeline, health interval, and unhealthy threshold
  - it sources `~/.local/bin/env` and `~/.co_provider_env`, starts `control-host`, polls `co-status`, and exits `75` after repeated `restart_required` samples so launchd restarts it
  - failure or restart context primarily lives in stderr logs, not in a supported installable CO surface
- Reference truth:
  - an operator should be able to install and manage local root-host supervision from the packaged CO CLI without copying personal scripts between machines
  - machine-specific paths should be chosen from flags or defaults at install time, not baked into repo-tracked source
  - supervision state should stay narrow and operational: launch contract, health polling, restart reason, launchd status
- Target truth / intended delta:
  - CO ships a `control-host` supervision command family for macOS launchd
  - the install flow generates the required local config or launchd artifacts from explicit inputs plus current runtime defaults
  - the supervision runner persists restart or failure reasons into logs and status-readable state
  - status or restart or uninstall commands become machine-checkable CLI surfaces instead of local shell habits
- Explicitly out-of-scope differences:
  - queue-selection policy
  - merge or review orchestration policy
  - non-macOS service managers

## Not Done If
- The benefits still require manually copying a host-local shell script between machines.
- The shipped path still depends on hard-coded user-home, repo-root, or Homebrew Node paths.
- Failure and restart reasons are still opaque unless an operator manually inspects raw launchd behavior.
- Queue-management or merge-policy logic leaks into the local supervision contract.

## Goals
- Ship a supported macOS supervision surface for the root `control-host`.
- Keep runtime/bootstrap parity with the current local wrapper through configurable env/bootstrap sourcing plus explicit executable selection.
- Expose install or uninstall or status or restart workflows as machine-checkable CLI commands.
- Persist failure and restart reasons in logs or status-readable state.

## Non-Goals
- Broadening into queue-management, review handoff, or merge orchestration.
- Reopening `CO-115` child-runtime parity beyond consuming its already-landed launch contract.
- Shipping Linux or Windows service-manager support in this slice.
- Replacing the existing `control-host` runtime or provider workflow logic.

## Stakeholders
- Product: operators depending on a durable local root-host intake loop
- Engineering: CLI, control-host, launch/runtime, and macOS operational maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - install and uninstall and status and restart flows execute through the packaged CLI with deterministic output
  - the installed supervision path preserves root-host launch, health polling, and bounded restart behavior
  - failure or restart reasons become available from logs or status output without manual shell spelunking
- Guardrails / Error Budgets:
  - keep the supervision scope limited to root-host uptime plus health
  - preserve existing `control-host` behavior when supervision is not installed
  - prefer current-runtime discovery plus explicit config over ambient PATH assumptions

## User Experience
- Personas:
  - operator setting up local CO control-host supervision on a new macOS machine
  - operator checking whether the installed supervisor is running cleanly or restart-looping
- User Journeys:
  - install supervision from the packaged CLI with repo root, runtime, health settings, and env files either auto-discovered or explicitly configured
  - inspect current install or launchd state plus last restart or failure reason from a supported status command
  - restart or uninstall the supervised host cleanly without hand-editing `~/Library/LaunchAgents`

## Technical Considerations
- Architectural Notes:
  - add a dedicated CLI surface such as `control-host supervise install|uninstall|status|restart|run`
  - keep launchd ownership of process restart while making the runner itself part of the packaged CO surface
  - persist a supervision config plus a small status/state file under user-local support directories
  - use the current Node executable plus current CLI entrypoint as install-time defaults, not hard-coded Homebrew paths
  - keep env/bootstrap sourcing explicit and configurable, likely via a shell-owned child launch step so existing shell env files remain compatible
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - new supervision CLI or helper surfaces under `orchestrator/src/cli/control/`
  - macOS `launchctl`
  - `co-status` JSON output and its `restart_required` signal
  - packaged downstream CLI surface via `npm pack` or install

## Open Questions
- Should the default label stay `com.kbediako.co.control-host` for continuity, or move to a package-owned neutral label while allowing override?
- Should `status` read only launchd plus local state, or also attempt a bounded live `co-status --format json` probe when the host is installed and running?

## Approvals
- Product: self-approved from the Linear issue scope
- Engineering: pending audited `linear child-stream --pipeline docs-review` pre-implementation review
- Design: N/A
