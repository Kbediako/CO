---
id: 20260330-linear-271cbab4-de28-4847-a468-128df007c4a0
title: CO Implement parent-owned same-issue multi-worker runtime end to end
relates_to: docs/PRD-linear-271cbab4-de28-4847-a468-128df007c4a0.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- PRD: `docs/PRD-linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- Task checklist: `tasks/tasks-linear-271cbab4-de28-4847-a468-128df007c4a0.md`

## Traceability
- Linear issue: `CO-35` / `271cbab4-de28-4847-a468-128df007c4a0`
- Linear URL: https://linear.app/asabeko/issue/CO-35/co-implement-parent-owned-same-issue-multi-worker-runtime-end-to-end

## Summary
- Objective: land the first real parent-owned same-issue multi-worker runtime slice under the existing `provider-linear-worker` issue owner, with explicit scope ownership, stale-output invalidation, parent-only Linear mutation enforcement, and nested child-lane observability.
- Scope:
  - docs-first registration for `CO-35`
  - extend the current bounded child-stream contract into a real same-issue child-lane runtime
  - add parent-launched subordinate lane lifecycle plus explicit accept/reject/invalidate decisions
  - keep subordinate work inside the per-issue workspace boundary via lane-local worktree plus patch artifact flow
  - expose nested `child_lanes` in parent proof and read-side observability while keeping one authoritative issue owner
  - add focused regressions and real runtime proof using more than one subordinate lane
- Constraints:
  - keep the existing control-host plus `provider-linear-worker` as the only external issue owner
  - preserve `docs-review` / `implementation-gate` / `docs-relevance-advisory` child-stream support
  - stay on the current `codex exec` / `codex exec resume` supervision seam
  - do not weaken `delegation-guard` or let subordinate lanes mutate Linear directly

## Technical Requirements
- Functional requirements:
  - the parent `provider-linear-worker` run must be able to launch more than one subordinate same-issue lane with:
    - task id `<parent-task-id>-<stream>`
    - `parent_run_id` set to the parent provider-worker run id
    - declared `purpose`
    - declared file-scope or phase-scope ownership
  - child-lane launch must fail closed unless:
    - the current run is an authenticated parent `provider-linear-worker`
    - provider control-host provenance is recorded and matches the active environment
    - the requested child scope does not overlap an unresolved earlier child lane for the same parent issue
  - the first slice must support parent-managed child-lane decisions:
    - `launch`
    - `accept` or integrate into the authoritative parent workspace
    - `reject`
    - `invalidate` when the lane is stale because parent `HEAD`, issue freshness, or review state changed
    - `rerun` by relaunching the same stream after the prior lane is rejected or invalidated
  - child-lane execution must stay inside the authoritative per-issue workspace boundary by creating a lane-local worktree rooted under the parent workspace and emitting a patch artifact that the parent applies explicitly
  - child lanes must never mutate:
    - Linear issue state
    - the persistent workpad comment
    - PR attachments
    - review, rework, merging, or done handoff state
  - parent proof must expose nested `child_lanes` detail with:
    - lane id or stream
    - task id
    - run id
    - status
    - purpose
    - declared scope
    - parent snapshot metadata (`base_sha`, issue freshness)
    - worktree path
    - patch artifact path
    - parent decision (`accepted`, `rejected`, `invalidated`, or pending)
  - read-side observability must surface nested `child_lanes` from the parent proof or a derived payload without creating peer issue-owner rows for subordinate manifests
  - `discoverProviderIssueRuns` must continue to discover only the parent authoritative provider run for the issue and suppress subordinate manifests by pipeline plus lineage
  - the lane must capture at least one real runtime proof from the current `CO-35` run where the parent uses more than one subordinate lane and keeps one truthful workpad or PR lifecycle
- Non-functional requirements (performance, reliability, security):
  - scope conflict checks must fail closed and be deterministic from persisted child-lane records
  - stale-output invalidation must be based on explicit parent snapshot data, not heuristic diff guesses
  - patch integration must remain parent-reviewed and auditable; no implicit background merges
  - child-lane workspace cleanup must not mutate the authoritative parent workspace unexpectedly
- Interfaces / contracts:
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/run/workspacePath.ts`
  - new same-issue child-lane shell and runner files to be added in `orchestrator/src/cli/`

## Architecture & Data
- Architecture / design adjustments:
  - keep `provider-linear-worker` as the parent issue owner and add a sibling helper surface for real same-issue child lanes rather than overloading the existing review/docs child-stream lane
  - reuse the parent proof sidecar as the external truth source, but widen it from review-only `child_streams` to richer `child_lanes` records
  - keep bounded review/docs child streams working as-is and model them as a `lane_kind` within the broadened child-lane ledger
  - enforce parent-only Linear mutation in the packaged helper CLI by rejecting mutating subcommands from subordinate manifests
  - create one dedicated subordinate pipeline (same-issue child lane) that runs a bounded lane prompt inside a lane-local worktree and emits a patch artifact for parent review
  - store child-lane lineage and decision state in one parent-owned ledger file so proof hydration, stale checks, and observability all read from the same truth source
- Data model changes / migrations:
  - widen `ProviderLinearWorkerChildStreamRecord` into a richer child-lane record shape with purpose, scope, lane kind, parent snapshot, patch artifact, decision state, and invalidation metadata
  - add `child_lanes` to `ProviderLinearWorkerProof` while preserving `child_streams` as a compatibility alias for existing surfaces
  - no external database or schema migration; all data remains manifest and sidecar based
- External dependencies / integrations:
  - existing provider worktree creation in `orchestrator/src/cli/run/workspacePath.ts`
  - existing start pipeline plumbing in `codex.orchestrator.json`
  - existing control-host discovery and dashboard presenters

## Validation Plan
- Tests / checks:
  - rerun docs-review after the `CO-35` packet exists and record the manifest in `tasks/index.json` once successful
  - focused launcher and CLI regressions for:
    - parent provenance validation
    - parent-only Linear mutation enforcement
    - scope conflict rejection
    - stale-output invalidation
    - patch integration decision flow
  - focused provider proof and observability regressions for nested `child_lanes`
  - focused `discoverProviderIssueRuns` regression proving subordinate same-issue lane manifests stay hidden from peer-owner discovery
  - required repo validation floor after implementation
  - standalone review plus elegance review before review handoff
- Rollout verification:
  - use the current `CO-35` provider-worker lane to launch at least two subordinate child lanes with non-overlapping scopes
  - record the parent proof before and after parent acceptance or invalidation decisions
  - verify observability still shows one parent issue row with nested subordinate detail
- Monitoring / alerts:
  - keep runtime proof artifacts under `out/linear-271cbab4-de28-4847-a468-128df007c4a0/manual/`
  - refresh the persistent Linear workpad after docs-review, after child-lane proof capture, and before review handoff

## Open Questions
- Should the compatibility layer expose `child_lanes` as a first-class payload immediately, or is passing the richer proof through enough for this slice?
- Should the first slice clean up accepted or invalidated lane worktrees automatically, or keep cleanup manual until the proof flow is stable?

## Approvals
- Reviewer: Pending docs-review and implementation validation
- Date: 2026-03-30
