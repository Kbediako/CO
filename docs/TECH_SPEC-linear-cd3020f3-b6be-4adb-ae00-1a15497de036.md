---
id: 20260331-linear-cd3020f3-b6be-4adb-ae00-1a15497de036
title: CO: Make CO STATUS inspectable in smaller terminals and easy to launch
relates_to: docs/PRD-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md
risk: high
owners:
  - Codex
last_review: 2026-03-31
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`
- PRD: `docs/PRD-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`
- Task checklist: `tasks/tasks-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`

## Traceability
- Linear issue: `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`
- Linear URL: https://linear.app/asabeko/issue/CO-55/co-make-co-status-inspectable-in-smaller-terminals-and-easy-to-launch

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: extend the current live `CO STATUS` dashboard so it remains a live operator monitor but gains explicit freeze/inspect/export ergonomics plus an easier launch surface.
- Scope:
  - docs-first registration for `CO-55`
  - additive dashboard interaction/state changes in `controlStatusDashboard.ts`
  - dedicated `co-status` command surface
  - focused rendering/interaction/launch-path tests
  - operator-facing documentation for the new controls
- Constraints:
  - preserve `CO-44` parity work as the baseline instead of reopening general layout parity
  - preserve JSON and non-interactive output behavior
  - keep the solution localized to the dashboard interaction/launch seam

## Technical Requirements
- Functional requirements:
  - interactive `CO STATUS` must surface explicit operator controls in-terminal for freeze/resume, compact inspect, and snapshot export
  - the live renderer must support a frozen state where timer ticks and runtime subscription updates do not trigger follow-up frame writes until the operator resumes
  - while frozen, the current frame must remain visible and a pending-update indicator may accumulate state without forcing redraw
  - the dashboard must provide a supported shorter-terminal inspect path that lets operators read the top summary/header without fighting the full live frame; the bounded target is a compact summary-focused view toggled in the terminal
  - snapshot/export must capture a stable frame artifact under the current host run directory and report the artifact path clearly enough for later pager/review use
  - the dashboard must continue running after snapshot export so operators can resume live monitoring
  - a dedicated `co-status` launch surface must exist through the shipped CLI
  - docs/help text must teach operators the easier launch path and the in-terminal inspect controls
  - focused tests must cover live rendering, freeze/resume suppression, compact inspect behavior, snapshot export, and the new launch surface
- Non-functional requirements (performance, reliability, security):
  - keyboard handling must stay bounded to interactive TTY usage only
  - frozen mode must not leak uncontrolled redraws or spin background timers into duplicate render work
  - snapshot export paths must remain inside the current host run directory and be sanitized/deterministic enough for evidence capture
- Interfaces / contracts:
  - renderer/runtime: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - host startup: `orchestrator/src/cli/controlHostCliShell.ts`
  - CLI entrypoint: `bin/codex-orchestrator.ts`
  - repo-local launch alias: `package.json`
  - focused regressions: `orchestrator/tests/ControlStatusDashboard.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - extend the dashboard runtime state with:
    - `paused` / `frozen` mode
    - `viewMode` (`full` vs compact inspect)
    - last-rendered dataset/frame cache for frozen-mode interactions
    - transient operator notice state for exported snapshot paths or pending-update markers
  - add interactive key handling only when stdin/stdout are TTY-backed and raw input can be enabled safely; the bounded control contract is:
    - `p`: pause/resume live redraw
    - `c`: toggle compact inspect view
    - `s`: export a stable snapshot artifact
  - keep the existing full live frame as the default view, and make compact inspect an explicit operator action for short terminals rather than silently replacing the full dashboard
  - store snapshot exports beneath the active host run directory so workpad/validation evidence can point at repo-local artifacts deterministically
  - add `co-status` as a first-class CLI alias over the existing control-host dashboard launch path instead of creating a second monitoring runtime
- Data model changes / migrations:
  - no changes to the authoritative `OperatorDashboardDataset`
  - only dashboard-local interaction state and snapshot artifact paths are added
- External dependencies / integrations:
  - `OperatorDashboardDataset` stays the renderer truth source
  - local filesystem writes under the host run directory for snapshot export
  - existing CLI help + README/operator-facing docs for launch discovery

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ControlStatusDashboard` tests for:
    - controls/inspect affordance rendering
    - frozen-mode redraw suppression
    - compact inspect rendering for shorter terminals
    - snapshot export behavior
  - focused `ControlHostCliShell` startup-gating regressions for:
    - `control-host --format json` staying on the non-dashboard path
    - non-TTY sessions staying on the non-dashboard path even after keyboard handling lands
  - focused CLI/help tests for:
    - `co-status` launch alias dispatch/help
    - repo-local npm alias documentation
  - required repo validation floor after implementation
- Rollout verification:
  - capture screenshot proof for normal live mode
  - capture screenshot proof for paused/frozen mode with redraw suppression visible
  - capture screenshot proof for the constrained-height inspect path
  - capture snapshot/export proof showing the stable inspection artifact
  - capture proof of the dedicated launch command surface
- Monitoring / alerts:
  - rely on focused tests and manual operator proof artifacts; this lane does not add new runtime telemetry

## Open Questions
- Whether the exported snapshot should preserve ANSI styling in addition to a pager-friendly plain-text form. The implementation should pick the smallest truthful operator contract and record it explicitly in help/docs/workpad notes.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-03-31
