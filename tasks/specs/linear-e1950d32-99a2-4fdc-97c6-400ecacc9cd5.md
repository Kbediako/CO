---
id: 20260325-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5
title: CO Reconcile Terminal Provider-Worker Failures and Stale Intake Workpad State
status: in_progress
owner: Codex
created: 2026-03-25
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md
related_action_plan: docs/ACTION_PLAN-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md
related_tasks:
  - tasks/tasks-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-03-25: Opened from Linear issue `CO-18` after confirming the live CO workflow states via `linear issue-context`, observing the issue in `Ready`, and transitioning it to `In Progress`.
  - 2026-03-25: docs-review approval mirrored from the checklist: self-approved by `provider-worker` at 2026-03-24T23:32:36Z after `/Users/kbediako/Code/CO/.runs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/cli/2026-03-24T23-27-44-639Z-c2876226/manifest.json` succeeded with no blocking comments.
  - 2026-03-25: The required failed baseline was re-audited from the canonical main-checkout artifacts because the cited `.runs` payloads are not stored under the current worktree path.
  - 2026-03-25: The failed `CO-16` artifact pair proves a terminal worker failure (`manifest.status = failed`, `proof.owner_status = failed`, `proof.end_reason = codex_exit_1`) after successful Linear writes had already occurred.
  - 2026-03-25: Current local control-host intake state has since been manually recovered, so this lane targets the missing automatic reconciliation path rather than replaying the already-fixed live stale snapshot.
  - 2026-03-25: Delegation override is required for this worker run because `spawn_agent` is unavailable without explicit user authorization in-session.
  - 2026-05-18: CO-522 active-spec audit found 3 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context

The original `CO-16` provider-worker lane ended in a real autonomous failure, but the operator-facing control-host/Linear surfaces did not converge on that truth quickly enough. The failed child run wrote a terminal failed manifest and terminal failed worker proof, yet the issue remained presented as actively owned with stale tracker metadata until manual recovery finished the work on a later PR. `CO-18` is the bounded reconciliation lane for that failure lifecycle, not a continuation of the earlier review-wrapper implementation.

## Requirements

1. Register the lane across PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness registry.
2. Capture the failed `CO-16` baseline precisely from:
   - `/Users/kbediako/Code/CO/.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T07-52-01-619Z-c8fa582f/manifest.json`
   - `/Users/kbediako/Code/CO/.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T07-52-01-619Z-c8fa582f/provider-linear-worker-proof.json`
   - `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
3. Reconcile terminal failed provider-worker runs into truthful persisted intake state so failed runs do not remain `running`.
4. Refresh persisted issue metadata during failure reconciliation so stale `Ready` or other outdated issue state does not leak into later refresh/dispatch decisions.
5. Add a truthful failure-side Linear/workpad update path that leaves operators with the actual blocker.
6. Cover manifest/proof failure reconciliation, rehydrate/refresh metadata handling, and operator-facing runtime projections with focused tests.

## Current Truth

- `providerIssueHandoff.ts` already has rehydrate/refresh paths for active, resumable, completed, released, and retrying claims.
- Before this lane, those paths depended on control-host refresh/rehydrate running while the worker only wrote proof and did not explicitly force terminal failure reconciliation back into the control host.
- `discoverProviderIssueRuns()` now reads manifest state plus `PROVIDER_LINEAR_WORKER_PROOF_FILENAME`, and the handoff service resolves `status`, `summary`, and `updatedAt` through proof-aware helpers gated by proof authority.
- `controlRuntime.ts` still exposes provider intake from persisted claim state, so truthful failure-side persisted metadata remains the operator-visible source of truth after reconciliation.
- The local Symphony baseline still expects single-owner orchestration, deterministic retries, and truthful release/recovery behavior.

## Validation Plan

- docs-review before implementation
- focused `ProviderIssueHandoff` tests for failed manifest/proof reconciliation and stale metadata refresh
- focused `ProviderLinearWorkerRunner` tests for terminal failure reconciliation callback and failure-side workpad truthfulness
- focused `ControlRuntime` tests for operator-visible provider-intake state after reconciliation
- full repo validation floor
