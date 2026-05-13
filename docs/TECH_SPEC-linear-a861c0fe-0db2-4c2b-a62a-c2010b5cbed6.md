---
id: 20260330-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6
title: CO Add Terminal Observability Dashboard as CO STATUS
relates_to: docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
- PRD: `docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
- Task checklist: `tasks/tasks-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`

## Traceability
- Linear issue: `CO-26` / `a861c0fe-0db2-4c2b-a62a-c2010b5cbed6`
- Linear URL: https://linear.app/asabeko/issue/CO-26/co-add-terminal-observability-dashboard-as-co-status

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add a live `CO STATUS` terminal dashboard to the `control-host` runtime by rendering the existing operator dashboard dataset in-shell instead of introducing a second observability truth path.
- Scope:
  - docs-first registration for `CO-26`
  - one control-host-local terminal dashboard renderer over the existing operator dashboard dataset
  - startup/shutdown wiring in `controlHostCliShell.ts`
  - focused tests for renderer output and terminal-startup behavior
- Constraints:
  - preserve `control-host --format json` as machine-readable readiness output
  - keep the terminal surface read-only and TTY-aware
  - reuse `operatorDashboardPresenter.ts` / `controlRuntime.ts` instead of duplicating orchestration logic

## Technical Requirements
- Functional requirements:
  - `control-host` text-mode startup on a TTY must render a terminal dashboard headed exactly `CO STATUS`
  - the dashboard data source must be the existing operator dashboard presenter / compatibility projection path, not a second terminal-only snapshot derivation
  - the dashboard must show running sessions, retry/backoff queue, aggregate token/runtime totals, latest rate-limit data, and refresh/poll health
  - the dashboard must show per-issue/session rows with identifier, lifecycle state, owner/session metadata, workspace/host context, retry status, and last error when available
  - the dashboard must update live from a bounded timer that requests a fresh runtime snapshot (`runtime.requestRefresh()` or equivalent) plus runtime invalidation notifications so the shell stays usable while the control-host remains active
  - `control-host --format json` must remain dashboard-free and keep returning the current readiness payload
  - non-TTY text-mode runs must remain safe and readable instead of emitting endless ANSI-cleared frames into logs
- Non-functional requirements (performance, reliability, security):
  - keep rendering bounded and read-only
  - avoid interactive control prompts or control-plane mutations in the dashboard path
  - degrade gracefully when the projection is empty or optional rate-limit/polling data is absent
- Interfaces / contracts:
  - dataset input: `OperatorDashboardDataset` from `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - runtime source: timer-driven `ControlRuntime.requestRefresh()` (or equivalent fresh-snapshot path) followed by `ControlRuntime.snapshot().readCompatibilityProjection()`, plus `runtime.subscribe(...)` / publish invalidations for event-driven rerenders
  - startup surface: `orchestrator/src/cli/controlHostCliShell.ts`
  - focused regressions: new terminal dashboard tests plus `orchestrator/tests/ControlHostCliShell.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a control-host terminal dashboard helper that renders the existing operator dashboard dataset into ASCII/ANSI terminal frames
  - start that helper from `controlHostCliShell.ts` after the public lifecycle is ready, and stop it during process shutdown
  - keep the renderer responsible only for terminal presentation and refresh cadence; timer-driven refreshes should request a fresh runtime snapshot before rereading the presenter data, while data shaping stays in `operatorDashboardPresenter.ts`
  - keep base-url/task/run metadata additive in the terminal frame so the shell remains auditable without opening `/ui`
- Data model changes / migrations:
  - none; this lane should reuse the existing operator dashboard dataset and persisted control-host state
- External dependencies / integrations:
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - Symphony reference terminal dashboard files under `/Users/kbediako/Code/symphony/elixir/`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation edits
  - focused tests for terminal rendering content, empty-state handling, and `control-host` startup gating
  - required repo validation floor after implementation
- Rollout verification:
  - verify that interactive `control-host` startup renders `CO STATUS`
  - verify that the terminal frame contains the required summary, queue, and issue/session information
  - verify that JSON and non-TTY output remain deterministic and non-dashboard-oriented
- Monitoring / alerts:
  - rely on focused test coverage plus manual terminal verification during review handoff
  - keep dashboard rendering observational; any data staleness should track back to the shared runtime/presenter seam rather than terminal-only state

## Open Questions
- Resolved in planning: this lane should not introduce a separate terminal refresh API or terminal-side state cache; the current shared presenter is sufficient.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-03-30
