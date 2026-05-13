# PRD - CO: Make CO STATUS inspectable in smaller terminals and easy to launch

## Added by Bootstrap 2026-03-31

## Traceability
- Linear issue: `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`
- Linear URL: https://linear.app/asabeko/issue/CO-55/co-make-co-status-inspectable-in-smaller-terminals-and-easy-to-launch

## Summary
- Problem Statement: `CO-44` restored the live `CO STATUS` frame to a Symphony-style terminal dashboard, but it is still hard to inspect once active because the renderer always clears and redraws, there is no keyboard interaction, the frame can exceed short terminal heights, there is no supported snapshot/export path, and routine operators still have to remember the longer `control-host` launch surface.
- Desired Outcome: keep the existing live dashboard, but make it intentionally inspectable for day-to-day operator use by adding an explicit pause/freeze path, a supported short-terminal inspect path, a stable snapshot/export flow, and a dedicated monitoring launch command.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-55` by extending the current live `CO STATUS` terminal surface so operators can freeze redraws, inspect the top summary/header on shorter terminals, export a stable frame for pager/scrollback inspection, then resume live monitoring deliberately, while also getting a simpler dedicated command to launch the dashboard.
- Success criteria / acceptance:
  - operators can freeze live redraw without losing the current frame
  - timed refreshes and runtime-triggered renders stay suppressed while frozen until the operator resumes
  - shorter terminals have a supported inspect path for the top summary/header instead of forcing a fight against the full live frame
  - operators can export a stable dashboard snapshot suitable for later scrollback or pager inspection without giving up the live dashboard
  - the dashboard teaches its inspect controls in-terminal clearly enough to discover them without repo archaeology
  - `codex-orchestrator co-status` exists as an operator-facing entrypoint for routine monitoring, with any repo-local alias treated as additive rather than required
  - focused tests cover the new interaction contract instead of only static rendering
- Constraints / non-goals:
  - preserve the existing live dashboard and current operator-dashboard data seam from `CO-44`
  - keep JSON and non-interactive `control-host` behavior unchanged
  - do not widen into unrelated provider lifecycle or observability model work
  - treat Symphony as the layout-density baseline, but explicitly go beyond it on terminal inspectability because the local Symphony terminal dashboard still lacks pause/freeze and short-height inspect behavior

## Goals
- Make the current live `CO STATUS` dashboard intentionally inspectable while it is running.
- Add a supported operator path for short-terminal summary/header inspection.
- Add a stable snapshot/export path for later pager or scrollback inspection.
- Add a simple dedicated launch surface for routine monitoring.

## Non-Goals
- Replacing `CO STATUS` with a browser-first monitoring workflow.
- Reopening the `CO-44` parity lane around general frame structure, running-table parity, or data-model expansion.
- Changing provider ownership, retry scheduling, or control-host lifecycle beyond the bounded dashboard interaction surface.

## Stakeholders
- Product: CO operator / maintainers who monitor live provider activity in the terminal
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - operators can freeze the current live frame intentionally and inspect it without follow-up redraw churn
  - shorter terminals have a truthful supported path to inspect the top summary/header
  - snapshot/export produces a stable artifact path that can be cited in review/workpad evidence
  - the easier launch surface is documented and auditable in CLI help and repo-facing docs
- Guardrails / Error Budgets:
  - preserve `control-host --format json` as machine-readable readiness output
  - preserve readable non-TTY text behavior
  - keep the solution additive and localized to dashboard interaction/launch surfaces rather than reworking the underlying read model

## User Experience
- Personas: CO operator watching the live control-host shell; maintainer checking active runs in a shorter terminal or tmux pane; reviewer verifying dashboard ergonomics from proof artifacts
- User Journeys:
  - operator launches `codex-orchestrator co-status`, sees the normal live `CO STATUS` frame, and can discover the inspect controls directly in the dashboard
  - operator presses the documented freeze key, then scrolls or switches into a compact inspect view to read the top summary/header without the renderer pulling the terminal back into live redraw
  - operator exports a stable snapshot artifact, opens or cites that artifact for pager/review use, and then resumes the live dashboard intentionally

## Technical Considerations
- Architectural Notes:
  - the current live terminal seam is still localized in `orchestrator/src/cli/control/controlStatusDashboard.ts` and the startup/command surface in `orchestrator/src/cli/controlHostCliShell.ts` plus `bin/codex-orchestrator.ts`
  - the existing CO parity work from `CO-44` stays authoritative for frame structure and width-aware rendering; this lane should extend that renderer instead of replacing it
  - the bounded design target is:
    - a keyboard-driven freeze/resume mode
    - a compact inspect mode focused on the top summary/header for shorter terminals
    - snapshot export to a stable artifact under the host run directory
    - a dedicated `co-status` alias and matching operator-facing documentation
  - reviewer validation must include screenshot proof for live mode, frozen mode, constrained-height inspect mode, snapshot/export output, and the dedicated launch path
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/tests/ControlStatusDashboard.test.ts`
  - `orchestrator/tests/ControlHostCliShell.test.ts`
  - `bin/codex-orchestrator.ts`
  - `package.json`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/cli.ex`

## Open Questions
- Whether snapshot export should preserve ANSI color or emit plain text only. The implementation should choose the smallest operator-usable format and document the resulting pager/inspection contract explicitly.

## Approvals
- Product: Self-approved from the Linear issue scope and acceptance criteria
- Engineering: Pending docs-review + implementation validation
- Design: N/A
