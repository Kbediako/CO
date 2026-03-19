---
id: 20260314-1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract
title: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Manifest Contract
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md
related_tasks:
  - tasks/tasks-1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Manifest Contract

## Summary

Prevent `resume()` from leaving the persisted manifest falsely live when control-plane startup fails before the resumed run becomes ready.

## Scope

- `resume()` pre-start failure manifest contract
- explicit failure status detail for this boundary
- force-persisted failure state before rethrow
- one public CLI resume failure-path regression

## Out of Scope

- `start()` semantics
- shared lifecycle helper extraction
- cleanup ownership in `startOrchestratorControlPlaneLifecycle(...)`
- execution routing, runtime selection, or `performRunLifecycle(...)`

## Notes

- 2026-03-14: Registered after `1165` completed. The next truthful implementation move is the narrower `resume()` pre-start failure manifest contract so a failed restart cannot leave the persisted run looking live. Evidence: `out/1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment/manual/20260313T223851Z-closeout/14-next-slice-note.md`, `docs/findings/1166-orchestrator-resume-pre-start-failure-manifest-contract-deliberation.md`.
- 2026-03-14: Pre-implementation local read-only review approved for docs-first registration. Existing startup cleanup ownership already lives in `startOrchestratorControlPlaneLifecycle(...)`; the missing contract is the manifest outcome after pre-start failure. Evidence: `docs/findings/1166-orchestrator-resume-pre-start-failure-manifest-contract-deliberation.md`.
- 2026-03-14: Completed. `resume()` now force-persists a terminal failed manifest with `status_detail = resume-pre-start-failed` when control-plane startup rejects before readiness, the original startup error is rethrown unchanged, the public CLI regression proves the stored manifest no longer remains falsely `in_progress`, the rerun `docs-review` succeeded, and the explicit non-green item is bounded standalone-review drift. Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/00-summary.md`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/05-test.log`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/05b-targeted-tests-post-elegance.log`, `.runs/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/cli/2026-03-13T23-06-07-093Z-e859731a/manifest.json`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/13-override-notes.md`.
