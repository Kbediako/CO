# PRD - CO Add Terminal Observability Dashboard as CO STATUS

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-26` / `a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`
- Linear URL: https://linear.app/asabeko/issue/CO-26/co-add-terminal-observability-dashboard-as-co-status

## Summary
- Problem Statement: `CO-7` already shipped the richer browser operator observability surface on `/ui`, backed by the shared compatibility projection, operator dashboard presenter, and poll-health read model. The remaining operator gap is terminal-first: `control-host` still prints readiness lines and then waits, so there is no live in-shell dashboard analogous to Symphony's supervised status board.
- Desired Outcome: starting the relevant CO control-host process in normal text mode should render a live read-only terminal dashboard headed exactly `CO STATUS`, fed from the same authoritative runtime snapshot and presenter/read-model layer already used by the other CO observability surfaces.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete Linear issue `CO-26` by adding a terminal-based observability surface called exactly `CO STATUS`, modeled on Symphony's terminal dashboard rather than another browser page, while keeping the terminal surface read-only and grounded in the same runtime truth as `/ui`.
- Success criteria / acceptance:
  - starting the relevant CO process renders a terminal dashboard headed exactly `CO STATUS`
  - the dashboard remains read-only and is fed from authoritative runtime state rather than terminal-only bookkeeping
  - it shows running sessions, retry/backoff queue, aggregate token/runtime totals, latest rate-limit data, and refresh/poll health
  - it shows per-issue/session rows with identifier, lifecycle state, active agent/session metadata, workspace/host context, retry status, and last error when available
  - it refreshes live in-terminal in a way analogous to Symphony's terminal dashboard and remains usable without the web `/ui` surface
  - it reuses the shared observability presenter/read-model where practical instead of duplicating orchestration logic for the terminal path
- Constraints / non-goals:
  - this is terminal-first follow-up scope, not another web-dashboard packet
  - preserve machine-readable `control-host --format json` output and avoid polluting non-interactive automation with ANSI dashboard output
  - do not introduce new control actions, terminal-only truth, or duplicated orchestration logic
  - keep the implementation bounded to the current control-host runtime and existing operator dashboard presenter unless a smaller truthful seam emerges during implementation

## Goals
- Add a first-class terminal observability surface headed exactly `CO STATUS`.
- Reuse the current compatibility projection, operator dashboard presenter, and poll-health read model as the dashboard truth source.
- Keep the terminal surface read-only and live-updating in an operator-friendly shell flow.
- Preserve the current `/ui` and `--format json` surfaces while extending observability into the terminal.

## Non-Goals
- Reworking the already-landed `/ui` browser dashboard beyond incidental presenter reuse.
- Adding terminal actions for refresh, pause, resume, or any other control mutation.
- Introducing a second observability projection or separate terminal-only state cache.
- Expanding this lane into unrelated control-host lifecycle or provider workflow changes.

## Stakeholders
- Product: CO operator who wants shell-native observability parity with Symphony's terminal dashboard posture
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `control-host` text-mode startup renders a live `CO STATUS` dashboard without needing `/ui`
  - the dashboard content stays aligned with the same authoritative runtime snapshot already used by the web/operator data surfaces
  - the terminal dashboard exposes the issue/session/rate-limit/poll-health detail required by the issue without widening control authority
- Guardrails / Error Budgets:
  - preserve `control-host --format json` output as machine-readable readiness-only output
  - keep terminal rendering TTY-aware so non-interactive logs are not flooded with ANSI screen clears
  - keep the change reviewable by rendering the existing `OperatorDashboardDataset` rather than building a second observability derivation path

## User Experience
- Personas: CO operator watching a live control-host shell; maintainer checking queue pressure and worker health without switching to a browser
- User Journeys:
  - operator runs `control-host` in a terminal and immediately sees `CO STATUS` with running/retrying/totals/rate-limit/poll-health summary plus issue rows
  - operator watches the dashboard update as provider polling and worker state change, without needing to open `/ui`
  - automation still runs `control-host --format json` or non-TTY launches without ANSI dashboard interference

## Technical Considerations
- Architectural Notes:
  - current shared observability truth already exists in `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/operatorDashboardPresenter.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, and `orchestrator/src/cli/control/providerPollingHealth.ts`
  - the current shell gap is localized in `orchestrator/src/cli/controlHostCliShell.ts`, which starts the control-host lifecycle, prints readiness text/json, and then waits for a signal
  - Symphony's reference terminal behavior lives in `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex` and is refreshed from `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - the smallest truthful implementation is a control-host terminal renderer over the existing operator dashboard dataset, with a bounded timer that requests a fresh runtime snapshot plus a runtime-notification refresh path
- Dependencies / Integrations:
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/providerPollingHealth.ts`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/fixtures/status_dashboard_snapshots/`

## Open Questions
- Resolved in planning: render the live terminal dashboard only in interactive text-mode TTY usage, while keeping JSON and non-interactive output deterministic and machine-safe.

## Approvals
- Product: Self-approved from the Linear issue scope and exact terminal-first naming requirements
- Engineering: Pending docs-review + implementation validation
- Design: N/A
