---
id: 20260402-linear-69030f04-cfa5-491b-8928-8f325f00da8d
title: CO: Make paused CO STATUS inspection scrollback-clean
relates_to: docs/PRD-linear-69030f04-cfa5-491b-8928-8f325f00da8d.md
risk: high
owners:
  - Codex
last_review: 2026-04-02
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-69030f04-cfa5-491b-8928-8f325f00da8d.md`
- PRD: `docs/PRD-linear-69030f04-cfa5-491b-8928-8f325f00da8d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-69030f04-cfa5-491b-8928-8f325f00da8d.md`
- Task checklist: `tasks/tasks-linear-69030f04-cfa5-491b-8928-8f325f00da8d.md`

## Traceability
- Linear issue: `CO-60` / `69030f04-cfa5-491b-8928-8f325f00da8d`
- Linear URL: https://linear.app/asabeko/issue/CO-60/co-make-paused-co-status-inspection-scrollback-clean
- Source issue: `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: keep `CO STATUS` as the normal live terminal monitor while making paused inspection scrollback-clean and truthful.
- Scope:
  - docs-first registration for `CO-60`
  - bounded terminal-surface changes in `controlStatusDashboard.ts`
  - focused regression coverage for live alternate-screen rendering and paused primary-buffer inspection
  - operator-facing README and task-doc updates for the chosen terminal semantics
- Constraints:
  - preserve the existing `CO-55` controls and snapshot export path
  - preserve JSON and non-interactive output behavior
  - do not widen into broader dashboard parity, data-model, or control-host lifecycle work

## Issue-Shaping Contract
- User-request translation carried forward:
  - `CO STATUS` must stay the same dashboard surface
  - pause/freeze semantics must stop depending on stacked historical redraws in primary scrollback
  - the operator must be able to inspect the paused frame cleanly without punting to `/ui`
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `pause`
  - `freeze`
  - `snapshot`
  - `inspect`
  - `scrollback`
  - `controlStatusDashboard.ts`
  - `ControlStatusDashboard.test.ts`
- Nearby wrong interpretations to reject:
  - only slow redraw cadence
  - only reduce frame density
  - document current stacked scrollback as acceptable
  - move normal paused inspection to the web UI
- Explicit non-goals carried forward:
  - no broader Symphony parity reopening
  - no operator dataset / presenter rebuild
  - no unrelated control-host orchestration changes

## Parity / Alignment Matrix
- Not applicable; this is a bounded terminal-semantics lane rather than a parity migration.
- Current truth:
  - interactive `CO STATUS` redraws use `ANSI_CLEAR_HOME` in the primary terminal buffer
  - pausing stops future redraws but leaves stacked historical full-frame writes in scrollback
- Reference truth:
  - the live dashboard can redraw frequently without making paused inspection depend on historical frame stack noise
- Target truth / intended delta:
  - live redraw occurs off the primary scrollback path
  - pausing exposes one clean inspect snapshot in the primary buffer
  - paused explicit rerenders do not reintroduce stacked full-frame history
- Explicitly out-of-scope differences:
  - frame-layout parity changes
  - new browser inspection surfaces
  - read-model changes

## Readiness Gate
- Not done if:
  - stacked primary-buffer redraw history remains the main paused inspection path
  - paused inspection cannot reach the top of the frame cleanly
  - the chosen terminal contract is missing from tests or docs
- Pre-implementation issue-quality review evidence:
  - the issue is correctly narrower than another full inspectability lane; `CO-55` already shipped pause/compact/snapshot controls, and this follow-up is specifically about the terminal buffer contract that still makes paused inspection noisy
- Safeguard ownership split:
  - implementation stays in `controlStatusDashboard.ts` plus focused docs/tests
  - no read-model, CLI-parser, or broader control-host lifecycle edits unless a concrete code seam proves they are required

## Technical Requirements
- Functional requirements:
  - live interactive `CO STATUS` must render in a way that does not stack full historical frames into the primary scrollback path
  - pausing must yield one clean static inspect frame in the primary terminal buffer
  - while paused, explicit inspect redraws such as compact-mode toggles or snapshot status updates must redraw in place instead of appending full-frame history
  - resuming must return the operator to the normal live monitor semantics on the same `CO STATUS` surface
  - compact inspect and snapshot export must remain available and truthful after the surface change
  - docs and focused tests must explain and enforce the chosen terminal mode behavior
- Non-functional requirements (performance, reliability, security):
  - alternate-screen behavior must stay gated to interactive TTY output
  - non-TTY and JSON behavior must remain unchanged
  - the implementation must not introduce extra refresh churn or hidden redraw loops while paused
- Interfaces / contracts:
  - renderer/runtime: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - focused regressions: `orchestrator/tests/ControlStatusDashboard.test.ts`
  - operator docs: `README.md`

## Architecture & Data
- Architecture / design adjustments:
  - add a dashboard-local surface mode that switches between alternate-screen live rendering and primary-buffer paused inspection
  - enter alternate screen for live interactive monitoring, then exit it on pause before writing the clean static snapshot to primary
  - while paused on primary, use in-place redraw for explicit inspect changes instead of appending new full frames
  - on resume, re-enter alternate screen and continue the existing refresh flow, forcing a refresh if updates accumulated while paused
- Data model changes / migrations:
  - no changes to `OperatorDashboardDataset`
  - only dashboard-local terminal-surface state changes
- External dependencies / integrations:
  - terminal alternate-screen escape sequences in interactive TTY mode
  - existing snapshot export under `co-status-snapshots/`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ControlStatusDashboard` tests for:
    - alternate-screen live rendering
    - pause handoff to one clean primary-buffer snapshot
    - paused redraw-in-place behavior for compact inspect / snapshot status
    - redraw suppression while paused
  - required repo validation floor after implementation
- Rollout verification:
  - capture proof showing live `CO STATUS`
  - capture proof showing the clean paused inspection state after several live redraws
  - capture proof or artifact showing the paused inspect frame can be reviewed without stacked redraw dependence
- Monitoring / alerts:
  - rely on focused tests and proof artifacts; this lane adds no new telemetry surface

## Open Questions
- None.

## Approvals
- Reviewer: codex-orchestrator docs-review (failed-other on unrelated docs:freshness baseline; manual fallback accepted)
- Date: 2026-04-02
