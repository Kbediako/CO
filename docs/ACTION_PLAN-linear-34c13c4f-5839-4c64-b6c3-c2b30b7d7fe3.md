# ACTION_PLAN - CO STATUS: hydrate active child-lane manifests before showing reserved-before-startup progress

## Added by Docs Child Lane 2026-04-17

## Summary
- Goal: make current `CO STATUS` progress use real active child-lane manifest evidence before showing the reserved-before-startup placeholder.
- Scope: docs-first packet, registry mirrors, parent-owned focused implementation, and parent-owned validation.
- Issue frame: `CO-210` is a provider-worker proof/progress/status projection truth gap, not a scheduler or child-lane authority redesign.
- Required protected terms: `CO STATUS`, `co-status --format json`, `provider-linear-worker-progress`, `Child lane reserved before child run startup.`, `provider-linear-worker-child-lanes.json`, `provider-linear-worker-proof.json`, child-lane manifest, `parent_run_id`, `issue_id`, `issue_identifier`, and `pipeline_id=provider-linear-child-lane`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO STATUS`
  - `co-status --format json`
  - `provider-linear-worker-progress`
  - `Child lane reserved before child run startup.`
  - `provider-linear-worker-child-lanes.json`
  - `provider-linear-worker-proof.json`
  - child-lane manifest
  - `parent_run_id`
  - `issue_id`
  - `issue_identifier`
  - `pipeline_id=provider-linear-child-lane`
- Not done if:
  - the reserved-before-startup placeholder remains current progress after a matching child-lane manifest starts
  - the placeholder is merely hidden without hydrating real child-run evidence
  - hydration can attach unrelated child manifests
  - stale Linear `updated_at` accept invalidation or child-lane acceptance/ownership semantics change
  - historical child-lane records are deleted
- Pre-implementation issue-quality review:
  - 2026-04-17: docs child lane preserved `CO-210` as a manifest hydration/progress truth issue and explicitly rejected stale Linear timestamp invalidation changes, scheduler redesign, child-lane authority weakening, historical record deletion, and display-only string hiding.

## Milestones & Sequencing
1. Create the docs-first packet and task checklist for `CO-210`.
2. Register the task in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Parent identifies the smallest proof/progress/status seam for hydrating active child-lane manifests before current progress selection.
4. Parent adds focused fixtures/tests for matching child manifest hydration, mismatched lineage rejection, and no-manifest fallback.
5. Parent implements metadata-safe hydration without changing scheduler, Linear lifecycle, or child-lane authority semantics.
6. Parent runs scoped validation and records evidence paths in the checklist.
7. Parent runs spec guard/docs-review or implementation gate, then owns PR lifecycle after accepting this patch artifact.

## Dependencies
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- child-lane manifest local artifact shape
- `provider-linear-worker-child-lanes.json`
- `provider-linear-worker-proof.json`
- `co-status --format json` projection surfaces

## Validation
- Docs child lane:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - targeted protected-term check across the created packet files
- Parent implementation lane:
  - matching started manifest hydrates over `Child lane reserved before child run startup.`
  - mismatched `parent_run_id`, `issue_id`, `issue_identifier`, or `pipeline_id` does not hydrate
  - missing child-lane manifest preserves truthful pre-startup fallback
  - existing disposed child-lane behavior remains unchanged
  - `node scripts/spec-guard.mjs --dry-run`
  - manifest-backed docs-review or implementation gate selected by parent

## Rollback
- Revert the parent-owned hydration change and focused tests if matching logic suppresses true pre-startup reservations or attaches unrelated child manifests.
- Do not roll back by deleting records from `provider-linear-worker-child-lanes.json` or `provider-linear-worker-proof.json`.

## Risks & Mitigations
- Risk: unrelated child manifests are hydrated into the active parent worker.
  - Mitigation: require `parent_run_id`, `issue_id`, `issue_identifier`, `pipeline_id=provider-linear-child-lane`, matching `task_id`, and a valid child `run_id` inside the expected child task artifact tree.
- Risk: pre-startup reservations stop being visible.
  - Mitigation: keep the placeholder fallback when no matching started manifest exists.
- Risk: scope drifts into scheduler or child-lane authority redesign.
  - Mitigation: keep implementation local to proof/progress/status projection and preserve existing ownership/acceptance semantics.
- Risk: display-only hiding masks the bug.
  - Mitigation: require manifest-backed evidence in tests and proof/progress output.

## Approvals
- Docs-first packet: produced by same-issue docs child lane `.runs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3-docs-packet/cli/2026-04-17T01-07-48-639Z-27495b47/manifest.json`.
- Parent docs-review: pending parent lane acceptance.
- Parent implementation/review/PR lifecycle: pending parent lane.
