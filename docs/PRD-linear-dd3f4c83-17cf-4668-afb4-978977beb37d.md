# PRD - CO: roll out the shipped CO-117 control-host supervision path so the live host stops bypassing it

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-141` / `dd3f4c83-17cf-4668-afb4-978977beb37d`
- Linear URL: https://linear.app/asabeko/issue/CO-141/co-roll-out-the-shipped-co-117-control-host-supervision-path-so-the
- Related issues:
  - `CO-117`
  - `CO-113`
  - `CO-115`
- Current host-local baseline called out in the issue:
  - legacy supervisor script: `/Users/kbediako/.local/bin/co-control-host-supervisor.sh`
  - legacy LaunchAgent: `/Users/kbediako/Library/LaunchAgents/com.kbediako.co.control-host.plist`

## Summary
- Problem Statement: `CO-117` landed the packaged `control-host supervise` surface in source and docs, but the live host on this machine still runs through the old host-local shim and stale operator entrypoints. The shipped supervision path is therefore bypassed at runtime, so the real operator/runtime contract still depends on ad hoc local artifacts instead of the repo-owned rollout path.
- Desired Outcome: ship and adopt the actual migration path from the legacy shim-backed LaunchAgent to the packaged supervision path so operators can use one truthful CLI surface, `status` can distinguish legacy versus packaged rollout, and the live root host no longer starts beneath `~/.local/bin/co-control-host-supervisor.sh`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-141` in this provider-worker workspace by taking the already-shipped `CO-117` supervision feature and making it the real runtime path on this host. That means rollout and migration, not reopening the earlier feature design lane.
- Success criteria / acceptance:
  - the CLI artifact operators actually invoke exposes `control-host supervise ...` and matches the shipped repo surface
  - `control-host supervise install` or the canonical rollout path can replace the legacy shim-based LaunchAgent without hand-editing `~/Library/LaunchAgents`
  - `control-host supervise status` truthfully distinguishes a legacy shim rollout from a packaged rollout
  - after rollout or restart, the active root `control-host` is launched via the managed supervision path instead of the legacy shim
  - the rollout preserves current health-poll and restart semantics
  - docs give operators a concrete upgrade path from an existing shim install
- Constraints / non-goals:
  - do not reopen the original `CO-117` design or broaden into queue-management or merge-policy work
  - do not assume a global npm install is the only supported rollout target
  - keep the lane focused on real operator/runtime adoption and truthful rollout status

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `roll out the shipped CO-117 control-host supervision path`
  - `live host stops bypassing it`
  - `legacy shim`
  - `packaged supervision path`
  - `migration path`
  - `truthfully report whether the active host is still on a legacy shim path versus the packaged supervision path`
- Protected terms / exact artifact and surface names:
  - `control-host supervise install|status|restart|uninstall|run`
  - `co-control-host-supervisor.sh`
  - `LaunchAgent`
  - `launchd`
  - `control-host`
  - `provider-linear-worker`
  - `com.kbediako.co.control-host.plist`
  - `status`
  - `restart_required`
- Nearby wrong interpretations to reject:
  - "re-implement the whole CO-117 feature from scratch"
  - "just document a manual plist edit and call that rollout"
  - "fix only the docs; the live host can stay on the shim"
  - "assume the global npm install is the only valid operator path"
  - "broaden this into queue management, merge policy, or unrelated PATH cleanup"

## Parity / Alignment Matrix
- Current truth:
  - source and docs already expose `control-host supervise ...`
  - the live LaunchAgent on this host still points at `/Users/kbediako/.local/bin/co-control-host-supervisor.sh`
  - the active root-host process lineage is still shim-owned rather than managed by the shipped supervision path
  - the operator-facing `codex-orchestrator` currently on `PATH` on this machine is stale enough that it does not recognize `control-host supervise status --format json`
- Reference truth:
  - the shipped `CO-117` supervision surface should be the real operator/runtime path
  - an operator should be able to migrate an existing shim install without local shell or plist surgery
  - status should clearly tell whether the machine is still on the legacy shim baseline or the packaged managed rollout
- Target truth / intended delta:
  - rollout uses a truthful managed entrypoint and LaunchAgent contract owned by CO
  - `install` or the canonical rollout path migrates the old shim-backed LaunchAgent into managed supervision artifacts
  - `status` reports rollout mode and active-path truth, not only "installed versus not installed"
  - docs and validation prove the upgrade path from a legacy host baseline
- Explicitly out-of-scope differences:
  - redesigning the supervision runtime loop from `CO-117`
  - queue-selection, merge-state, or review-policy behavior
  - non-macOS service-manager support

## Not Done If
- The live host still starts beneath `~/.local/bin/co-control-host-supervisor.sh`.
- Operators still need ad hoc local plist edits to migrate from the legacy shim path.
- `control-host supervise status` cannot distinguish legacy rollout from packaged rollout.
- The only way to use the shipped rollout path is a fresh machine install instead of an upgrade from the real baseline.
- The lane drifts into queue-management or merge-policy work.

## Goals
- Define and ship the real adoption path from the legacy shim-backed LaunchAgent to the packaged supervision path.
- Make the operator-facing entrypoint truthful for the environments this lane supports.
- Teach `status` to classify legacy versus packaged rollout and report the active mode truthfully.
- Preserve the current health-poll and restart semantics while moving runtime ownership to the managed supervision surface.
- Document and validate the upgrade path from the existing shim baseline.

## Non-Goals
- Reopening the original `CO-117` supervision feature design.
- Changing queue-management, review, or merge orchestration behavior.
- Assuming only one deployment target such as global npm install.
- Broad host-wide package-manager cleanup unrelated to this rollout contract.

## Stakeholders
- Product: operators relying on the local root-host intake loop
- Engineering: CLI, control-host, provider-worker, and macOS rollout maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - a legacy-shim host can be migrated onto the shipped supervision path through a bounded CLI workflow
  - `status` reports the correct rollout mode and active launch path
  - the active root host is launched via the managed supervision path after rollout
  - operators have one concrete upgrade path documented in the repo
- Guardrails / Error Budgets:
  - preserve existing health-poll and restart semantics
  - fail closed when rollout status is ambiguous instead of claiming the host is managed
  - keep the rollout surface bounded to host supervision adoption only

## User Experience
- Personas:
  - operator upgrading an existing local control-host install that still uses the shim-backed LaunchAgent
  - operator validating whether the current host is truly on the managed rollout path
- User Journeys:
  - inspect current host state and learn whether the machine is still on the legacy shim baseline
  - run the canonical rollout or install path and have it replace the legacy LaunchAgent without hand edits
  - run `status` after restart and confirm the host is managed plus which entrypoint and artifacts are active

## Technical Considerations
- Architectural Notes:
  - the command family already exists in `bin/codex-orchestrator.ts` and the supervision helpers under `orchestrator/src/cli/`
  - the missing work is rollout truth and migration behavior, including how operator entrypoints on real machines reach the shipped surface
  - `status` currently reports install/config/state truth but does not yet classify the legacy shim baseline separately from managed rollout
  - the rollout path must preserve the current launchd ownership model and supervision runtime semantics from `CO-117`
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
  - `orchestrator/src/cli/control/controlHostSupervision.ts`
  - `docs/public/provider-onboarding.md`
  - macOS `launchctl`
  - local launchd artifacts and active process lineage on the host

## Open Questions
- Should the canonical upgrade path remain `control-host supervise install` with legacy detection built in, or does this lane need a distinct migration alias while keeping `install` idempotent?
- Which operator entrypoints should this lane explicitly bless for source checkouts versus packaged/global installs when the host is already using a stale global CLI?

## Approvals
- Product: self-approved from the Linear issue scope
- Engineering: docs-review child stream manifest `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d-co-141-docs-review/cli/2026-04-10T07-01-12-520Z-3922c49d/manifest.json` passed `spec-guard` and `docs:check`, then failed on the existing repo-wide `docs:freshness` stale-doc baseline (`stale docs: 119`); accepted fallback note: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T070112Z-docs-review-fallback.md`
- Design: N/A
