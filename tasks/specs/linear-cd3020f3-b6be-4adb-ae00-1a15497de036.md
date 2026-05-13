---
id: 20260331-linear-cd3020f3-b6be-4adb-ae00-1a15497de036
title: CO: Make CO STATUS inspectable in smaller terminals and easy to launch
status: done
owner: Codex
created: 2026-03-31
last_review: 2026-05-01
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md
related_action_plan: docs/ACTION_PLAN-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md
related_tasks:
  - tasks/tasks-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md
review_notes:
  - 2026-05-01: CO-454 live Linear audit confirmed CO-55 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-31` so historical implementation evidence remains preserved without staying in active-spec freshness. Evidence: `codex-orchestrator linear issue-context --issue-id cd3020f3-b6be-4adb-ae00-1a15497de036 --format json`.
  - 2026-03-31: Opened from Linear issue `CO-55` in the provider-worker workspace using the issue id `cd3020f3-b6be-4adb-ae00-1a15497de036`.
  - 2026-03-31: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active coding.
  - 2026-03-31: The workspace started detached at `64bcb2464`; a task branch `linear/co-55-status-inspectable-launch` was created before repo edits.
  - 2026-03-31: Re-audit of `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`, and the local Symphony references confirmed `CO-44` already solved layout parity but not inspectability: the CO renderer still clears and redraws continuously with no key handling, snapshot/export path, or short-height inspect flow.
  - 2026-03-31: The local Symphony reference remains the right baseline for layout density and width-aware tables, but it does not already provide pause/freeze or height-aware inspect behavior. This lane must therefore stay additive and explicitly go beyond Symphony only on the operator-inspectability gap.
  - 2026-03-31: Pre-implementation standalone self-review of the docs-first packet approved the bounded plan to add frozen-mode redraw suppression, compact inspect mode, snapshot export, and a dedicated `co-status` launch surface without reopening the broader dashboard/data-model lane.
  - 2026-03-31: The rerun docs-review child stream succeeded after two doc fixes: task-scoping the validation commands to `linear-cd3020f3-b6be-4adb-ae00-1a15497de036` and restoring JSON/non-TTY startup-gating regressions to the validation plan. Evidence: `.runs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036-docs-review/cli/2026-03-31T08-32-40-711Z-9badba58/manifest.json`.
---

# Technical Specification

## Context

`CO-44` restored `CO STATUS` into a real ANSI dashboard, but operators still cannot inspect it comfortably once live updates begin. The renderer always clears and repaints, so scrollback inspection is fragile, shorter terminals cannot reliably hold the top summary/header in view, and there is no stable snapshot/export path. Separately, routine monitoring still depends on remembering `control-host` rather than a dedicated dashboard-oriented command. The current gap is therefore no longer parity of the frame itself; it is inspectability and launch ergonomics for the already-shipped live frame.

## Requirements

1. When `CO STATUS` runs interactively on a TTY, expose discoverable operator controls for inspect behavior directly in the dashboard.
2. Support a frozen state where timer-driven refreshes and runtime subscription updates do not write new frames until the operator resumes.
3. Keep the currently visible frame stable while frozen and surface a truthful pending-update indicator or equivalent state without forcing redraw churn.
4. Provide a supported short-terminal inspect path for the top summary/header; the planned path is a compact summary-focused view toggled from the terminal.
5. Provide a stable snapshot/export action that writes an inspectable artifact under the current host run directory and reports that path clearly.
6. Keep the live dashboard available after snapshot export so the operator can resume monitoring intentionally.
7. Add a dedicated `co-status` CLI launch surface for routine monitoring; any repo-local alias is additive only if it stays cheap and does not widen the lane.
8. Preserve `control-host --format json` and non-TTY text behavior exactly as non-dashboard readiness outputs.
9. Add focused tests for the interaction contract, launch alias, and snapshot/export path.

## Planned Interaction Contract

- Default view:
  - current full live `CO STATUS` frame from `CO-44`
  - additive control/help lines that expose the bounded operator actions
- Keys:
  - `p`: pause/resume live redraw
  - `c`: toggle compact inspect view
  - `s`: export a stable snapshot artifact
- Expected operator flow:
  - launch `co-status`
  - press `p` to freeze
  - optionally press `c` to switch to compact inspect when the full frame is taller than the terminal
  - press `s` to export a stable snapshot for later pager/review use
  - press `p` again to resume the live dashboard

## Current Truth

- `controlStatusDashboard.ts` currently:
  - requests a refresh on timer ticks
  - rerenders immediately on runtime subscription updates
  - always clears + homes before writing the next frame
  - has no stdin/key handling or frozen-mode state
- `controlHostCliShell.ts` already owns the only dashboard attach point and should stay that way.
- `bin/codex-orchestrator.ts` exposes `control-host` but no dedicated `co-status` alias.
- `package.json` exposes no monitoring shortcut script today.

## Validation Plan

- audited `linear child-stream --pipeline docs-review` before implementation
- focused renderer/interaction tests covering:
  - live full-frame rendering still works
  - frozen-mode timer suppression
  - frozen-mode runtime-update suppression
  - compact inspect rendering for shorter terminals
  - snapshot export path creation
- focused startup-gating tests covering:
  - `control-host --format json` staying on the non-dashboard path
  - non-TTY sessions staying on the non-dashboard path after keyboard handling is added
- focused launch-path/help tests covering:
  - `co-status` command dispatch/help
  - any shipped additive alias path
- manual proof capture for:
  - live mode
  - frozen mode
  - constrained-height inspect mode
  - snapshot/export artifact
  - easier launch surface
- required repo validation floor plus standalone review and explicit elegance pass before review handoff

## Manifest Evidence

- Workpad comment: `acede6bd-bf0d-4c97-91c9-6f25b0bb64cb`
- Upstream references:
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/cli.ex`
