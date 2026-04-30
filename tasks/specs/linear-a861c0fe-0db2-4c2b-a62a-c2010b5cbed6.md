---
id: 20260330-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6
title: CO Add Terminal Observability Dashboard as CO STATUS
status: done
owner: Codex
created: 2026-03-30
last_review: 2026-04-30
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md
related_action_plan: docs/ACTION_PLAN-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md
related_tasks:
  - tasks/tasks-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md
review_notes:
  - 2026-04-30: CO-428 live Linear audit confirmed CO-26 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-30` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-03-30: Opened from Linear issue `CO-26` in the provider-worker workspace using the issue id `a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`.
  - 2026-03-30: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active coding.
  - 2026-03-30: `CO-7` already landed the shared operator dashboard presenter/web consumer path (`operatorDashboardPresenter.ts`, `/ui/data.json`, poll-health projection, and status-ui), so the remaining truthful gap is terminal presentation rather than another observability-read-model lane.
  - 2026-03-30: Local Symphony references were re-audited: `StatusDashboard` is the supervised live shell surface, refreshed from `Orchestrator.snapshot()` while the web dashboard remains optional. That is the parity pattern this lane should mirror.
  - 2026-03-30: The current CO shell gap is localized in `orchestrator/src/cli/controlHostCliShell.ts`, which prints readiness text/json and waits for a signal without any live terminal dashboard.
  - 2026-03-30: This lane stays bounded to one terminal renderer over the existing `OperatorDashboardDataset`, plus control-host startup wiring and focused tests. It intentionally does not reopen `/ui` or add terminal-side control actions.
---

# Technical Specification

## Context

The authoritative read-side work for CO observability is already in place. `controlRuntime.ts` builds the compatibility projection, `operatorDashboardPresenter.ts` shapes the richer operator dashboard dataset, and `/ui/data.json` already consumes that dataset. The missing piece for `CO-26` is a terminal-first operator surface. Right now `control-host` prints readiness output and then blocks, while Symphony runs a continuously refreshed terminal dashboard in the same long-lived host process.

## Requirements

1. When `control-host` runs in normal text mode on a TTY, render a terminal dashboard headed exactly `CO STATUS`.
2. Feed that dashboard from the existing operator dashboard presenter / compatibility projection path rather than terminal-only bookkeeping.
3. Show, at minimum:
   - running sessions
   - retry/backoff queue
   - aggregate token/runtime totals
   - latest rate-limit data
   - refresh/poll health
4. Show per-issue/session rows with:
   - identifier
   - lifecycle state
   - active agent/session metadata
   - workspace/host context
   - retry status
   - last error when available
5. Refresh the dashboard live in-terminal using a bounded timer that requests a fresh runtime snapshot plus a runtime notification path analogous to Symphony's dashboard flow.
6. Keep the surface read-only. The terminal renderer must not own refresh/pause/resume/cancel actions or any other control mutation path.
7. Preserve `control-host --format json` as machine-readable readiness output with no dashboard ANSI noise.
8. Preserve readable non-interactive text behavior; do not flood logs with ANSI-clear frames when stdout is not a TTY.
9. Add focused tests covering:
   - terminal-renderer content for populated and empty datasets
   - control-host startup gating so the dashboard only attaches for interactive text-mode usage
   - preservation of the current JSON/startup behavior

## Current Truth

- `orchestrator/src/cli/control/operatorDashboardPresenter.ts` already exposes a read-only `OperatorDashboardDataset` containing counts, totals, rate limits, polling health, running entries, retry entries, and issue payloads.
- `orchestrator/src/cli/control/controlRuntime.ts` already recomputes polling health on repeated compatibility reads and invalidates snapshots through runtime publish events.
- `orchestrator/src/cli/controlHostCliShell.ts` already owns the control-host foreground lifecycle and is therefore the smallest truthful place to attach a live terminal renderer.
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex` uses an ANSI clear/home terminal frame, periodic rerender discipline, and data from `Orchestrator.snapshot()`. CO should mirror that posture while reusing its own current dataset seam.

## Validation Plan

- audited `linear child-stream --pipeline docs-review` before implementation
- focused terminal renderer and control-host startup tests
- required repo validation floor after implementation
- standalone review plus explicit elegance pass before any review handoff

## Manifest Evidence

- Workpad comment: `c4e73b54-5a56-4f5e-b120-b7b4bb06e43c`
- Upstream references:
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/fixtures/status_dashboard_snapshots/`
