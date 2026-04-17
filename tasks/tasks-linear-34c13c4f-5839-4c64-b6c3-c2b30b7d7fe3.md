# Task Checklist - linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3

- Linear Issue: `CO-210` / `34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3`
- MCP Task ID: `linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3`
- Primary PRD: `docs/PRD-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- TECH_SPEC: `tasks/specs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- Source anchor: `ctx:sha256:530ad0bff819be566bc79e33d5f828c1347470cd404c9615dbda890743938120#chunk:c000001`

## Docs-First
- [x] PRD drafted for manifest-backed child-lane progress hydration before reserved-before-startup text. Evidence: `docs/PRD-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`.
- [x] TECH_SPEC drafted with protected terms, current/reference/target truth, metadata-safe matching requirements, non-goals, and validation plan. Evidence: `tasks/specs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`.
- [x] Registry and mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `.agent/task/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md` readiness gate.

## Analysis Evidence Required Before Implementation
- [x] Parent confirmed the proof/progress/status hydration seam in `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, and `orchestrator/src/cli/control/providerIssueObservability.ts`.
- [x] Parent confirmed child-lane manifest fields available for metadata-safe matching, including `parent_run_id`, `issue_id`, `issue_identifier`, `pipeline_id`, child `task_id`, safe real `run_id`, expected manifest path, and expected artifact root. Evidence: `readProviderLinearWorkerChildLaneManifestCandidate(...)` plus focused runner/projection regressions.
- [x] Parent confirmed no scheduler, child-lane authority, stale Linear `updated_at`, or historical retention change is needed. Evidence: `out/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/manual/manual-review.md` and `out/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/manual/elegance-review.md`.

## Implementation Acceptance
- [x] `CO STATUS` no longer shows `Child lane reserved before child run startup.` for an active child lane with a matching started child-lane manifest. Evidence: focused regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` and `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] `co-status --format json` / `provider-linear-worker-progress` expose manifest-backed child-lane status/progress for that shape. Evidence: focused regressions in `orchestrator/tests/ProviderIssueObservability.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Hydration rejects mismatched parent/issue/pipeline/task lineage and invalid child `run_id` artifact paths. Evidence: focused mismatch coverage plus the malformed child-manifest `run_id` regression in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Missing or not-yet-started child-lane manifests keep a truthful pre-startup fallback. Evidence: focused fallback coverage in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] `provider-linear-worker-child-lanes.json` and `provider-linear-worker-proof.json` preserve historical child-lane records. Evidence: launch-reservation ledger identity stays intact while proof/progress hydrate real child-run evidence.
- [x] Stale Linear `updated_at` accept invalidation, child-lane ownership/acceptance, and scheduler behavior remain unchanged. Evidence: scoped source diff plus `out/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/manual/manual-review.md`.

## Validation
- [x] Docs child lane JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane protected-term check. Evidence: `rg -n "CO STATUS|co-status --format json|provider-linear-worker-progress|Child lane reserved before child run startup\\.|provider-linear-worker-child-lanes\\.json|provider-linear-worker-proof\\.json|child-lane manifest|parent_run_id|issue_id|issue_identifier|pipeline_id=provider-linear-child-lane" docs/PRD-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md docs/TECH_SPEC-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md docs/ACTION_PLAN-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md tasks/specs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md tasks/tasks-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md .agent/task/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md` finds protected terms.
- [x] Parent focused progress/proof/status tests. Evidence: `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/SelectedRunProjection.test.ts orchestrator/tests/ProviderIssueObservability.test.ts orchestrator/tests/ControlRuntime.test.ts` passed after the final patch (`4` files, `364` tests).
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: passed in the parent implementation lane.
- [x] Parent manifest-backed standalone review completed successfully. Evidence: `../../.runs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/cli/2026-04-17T01-04-43-224Z-393e7661/review/telemetry.json` recorded `status=succeeded` and `review_outcome=bounded-success`.
- [x] Parent explicit elegance/minimality pass recorded. Evidence: `out/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/manual/elegance-review.md`.
- [x] Parent docs-freshness fallback classified as repo-baseline, not packet-local debt. Evidence: `out/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/docs-freshness.json` contains no CO-210 packet hits; see `out/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3/manual/docs-freshness-fallback.md`.

## Progress Log
- 2026-04-17: Same-issue docs child lane created the docs-first packet and preserved `CO-210` as a child-lane manifest hydration/progress truth issue, not a display-only placeholder hiding patch, scheduler redesign, child-lane authority change, stale Linear timestamp invalidation change, or historical record deletion.
- 2026-04-17: Parent revalidated the inherited CO-210 diff, found one additional fail-closed gap for malformed child-manifest `run_id` handling, patched it in `orchestrator/src/cli/providerLinearWorkerRunner.ts`, and added a focused regression in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- 2026-04-17: Parent reran focused regressions, full build/lint/test/docs gates, and pack smoke. `npm run docs:freshness` remained red only because of the standing repo-wide `263` stale rows plus the `221`-entry CO-175 rolling cohort; the CO-210 packet itself is absent from both stale and rolling hit sets.
- 2026-04-17: Manifest-backed standalone review completed with `review_outcome=bounded-success` and `termination_boundary.kind=command-intent`, which lane policy treats as successful bounded review completion rather than wrapper failure.
