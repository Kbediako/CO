---
id: 20260323-1319-coordinator-symphony-end-to-end-operational-parity-remediation
title: Coordinator Symphony End-to-End Operational Parity Remediation
status: in_progress
owner: Codex
created: 2026-03-23
last_review: 2026-03-23
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-end-to-end-operational-parity-remediation.md
related_tasks:
  - tasks/tasks-1319-coordinator-symphony-end-to-end-operational-parity-remediation.md
review_notes:
  - 2026-03-23: Opened after live CO investigation proved `CO-2` stopped at `In Review`, leaving PR `#285` open with unresolved feedback and merge conflicts, which is inconsistent with current Symphony end-to-end operational behavior.
  - 2026-03-23: Current Symphony repo was reverified locally and remotely at `a164593aacb3db4d6808adc5a87173d906726406`; the packet therefore audits against current source rather than earlier summaries alone.
  - 2026-03-23: Current Symphony audit distinguishes base `SPEC.md` requirements from optional extensions that Symphony currently operationalizes, especially worker-owned Linear writes and merge workflow behavior.
  - 2026-03-23: Current CO audit confirmed two separate live gaps at lane open: review handoff was not yet supported by the repo-local workflow contract beyond `In Review`, and `/api/v1/dispatch` could still leak stale `traceability.issue_identifier` after no issue remained dispatchable.
  - 2026-03-23: Live Linear issue-context evidence initially showed the CO team exposed `In Review` but not `Merging` or `Rework`; the team was updated the same day to add `Rework` and `Merging` while keeping `In Review` as the only review-handoff alias.
  - 2026-03-23: Follow-up parity audit found three narrower remaining deltas: CO still accepted arbitrary non-review `state_type: started` states for execution eligibility, the live team still uses `Ready` instead of Symphony's queued `Todo`, and the repo-local `Rework` contract still reused the old PR/workpad instead of resetting.
---

# Technical Specification

## Context

`1318` landed the worker-visible Linear helper, workpad handling, and initial workflow-state classification, but live evidence showed that CO still lacked the current Symphony workflow contract around review handoff, `Rework`, `Merging`, and final `Done`. The widened 2026-03-23 audit then narrowed the remaining in-scope work further: CO still needed an explicit `Ready` -> `Todo` queue alias for live-team unattended pickup, and its repo-local `Rework` contract still diverged from Symphony's reset semantics. `1319` is the authoritative remediation lane for that remaining gap.

## Requirements

1. Preserve the already-correct base scheduler truths from `1310` and the landed helper substrate from `1318`.
2. Audit and document the remaining delta across:
   - current Symphony `SPEC.md`
   - optional `SPEC.md` features currently exercised by Symphony
   - current Symphony Elixir operational workflow and implementation
   - current CO runtime/provider/read surfaces
3. Implement or plan the missing lifecycle stages:
   - review handoff boundary and truthful read-model shaping
   - review feedback sweep and re-entry
   - `Rework`
   - `Merging`
   - final `Done`
4. Keep remote workpad ownership and PR linkage consistent across the full lifecycle, including exact `Rework` reset semantics (close prior PR, remove old workpad, restart from a fresh branch).
5. Eliminate stale dispatch/read-model issue leakage after no issue remains active.
6. Determine whether live Linear workflow states need expansion and handle that truthfully.
7. Restrict active execution eligibility to the explicit named active workflow states from current Symphony instead of the broader Linear `started` type, with live-team `Ready` treated as the `Todo` queue alias.

## Current Truth

- Current Symphony `SPEC.md`:
  - requires scheduler/read-side behavior, retry/reconcile, workspace reuse/cleanup, optional observability, and optional extensions such as `linear_graphql`
  - does not require first-class orchestrator tracker write APIs
- Current Symphony Elixir repo:
  - ships tracker comment/state write APIs
  - requires one persistent workpad comment
  - requires PR feedback sweeps before handoff
  - routes through `Human Review`, `Merging`, `Rework`, and `Done`
  - uses a merge loop through the `land` skill
- Current CO:
  - supports worker-owned issue reads/writes through the helper CLI/facade
  - already includes per-issue worktree confinement for provider runs
  - already includes blocker-aware `Todo` suppression and optional read-only refresh/state surfaces
  - already exposes workpad/PR mutation continuity as a capability, but not as an owned later-lifecycle flow
  - now classifies review handoff explicitly, keeps `Rework` and `Merging` active, and fixes stale dispatch traceability
  - now has assignee-aware fresh dispatch/claim gating and repo-local workflow plus land-skill contract
  - now honors the explicit named `active_states` contract instead of accepting arbitrary non-review `state_type: started` states as active
  - now routes `Ready` as the live `Todo` equivalent and exposes exact `Rework` reset semantics, including bounded workpad removal support
  - has no automated follow-up issue creation flow
  - has no workflow cleanup hook / attached-PR auto-close behavior
  - has no workflow-file hot reload / last-known-good fallback seam
  - live team workflow now supports the core review/rework/merge vocabulary through `In Review`, `Rework`, and `Merging`

## Validation Plan

- Docs lane:
  - keep PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and freshness registry aligned
  - run `docs-review`, `npm run docs:check`, and `npm run docs:freshness`
- Implementation lane:
  - full validation floor
  - live Linear proof showing lifecycle progression through review handoff, rework or merge re-entry, and done
  - live `/api/v1/dispatch` proof showing no stale traceability leakage when nothing is dispatchable
