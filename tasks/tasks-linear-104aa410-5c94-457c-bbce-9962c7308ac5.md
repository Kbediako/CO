# Task Checklist - linear-104aa410-5c94-457c-bbce-9962c7308ac5

- Linear Issue: `CO-244` / `104aa410-5c94-457c-bbce-9962c7308ac5`
- MCP Task ID: `linear-104aa410-5c94-457c-bbce-9962c7308ac5`
- Primary PRD: `docs/PRD-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- TECH_SPEC: `tasks/specs/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- Source anchor: `ctx:sha256:7b36f0086f31a972affc4bd5f989199d7d1bfa3ba460ad8de937b4e7d71916c2#chunk:c000001`
- Parent worker manifest: `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5/cli/2026-04-18T06-39-49-873Z-49b0c9a0/manifest.json`

## Docs-First
- [x] PRD drafted for the `CO-244` provider-worker manifest provenance seam. Evidence: `docs/PRD-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`.
- [x] TECH_SPEC drafted with the bounded provenance tuple contract, protected terms, and rejected reinterpretations. Evidence: `tasks/specs/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`, `docs/TECH_SPEC-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`.
- [x] ACTION_PLAN drafted for the parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated for this packet. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`. Evidence: `.agent/task/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`.
- [x] Pre-implementation issue-quality review recorded in the spec notes. Evidence: `tasks/specs/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`.

## Turn / Parallelization
- [x] Live issue context inspected, issue moved `Ready` -> `In Progress`, one workpad created, and the required `parallelize_now` decision was recorded. Evidence: workpad comment `beb32779-3df9-4c7f-bdde-173fa5ca363d` and Linear helper outputs in the current run.
- [x] Same-turn same-issue child lane `docs-packet` launched and completed successfully. Evidence: `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5-docs-packet/cli/2026-04-18T06-47-21-165Z-f43e496c/manifest.json`.
- [x] Parent explicitly rejected the child-lane patch after review because it drifted from `CO-244` and missed the `provider_launch_source` + child-helper contract. Evidence: the same child-lane manifest plus the parent rejection decision recorded at `2026-04-18T07:00:28.037Z`.

## Implementation Acceptance
- [x] Manifest schema/types include `provider_launch_source`. Evidence: `schemas/manifest.json`, `packages/shared/manifest/types.ts`.
- [x] Ordinary bootstrap/backfill code writes the full control-host provenance tuple without overriding conflicting non-null provenance; resume preparation keeps the explicit overwrite carve-out. Evidence: `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`.
- [x] Focused regressions cover bootstrap/backfill plus child-lane and child-stream happy paths and mismatch behavior. Evidence: `orchestrator/tests/Manifest.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`, `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`.
- [ ] The parent provider-worker manifest persists non-null `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id` after a repaired live load path.
- [x] Same-issue `linear child-lane --action launch ...` succeeds with matching live provenance. Evidence: `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5-docs-packet/cli/2026-04-18T06-47-21-165Z-f43e496c/manifest.json`.
- [x] Same-issue `linear child-stream --pipeline docs-review|implementation-gate|docs-relevance-advisory` succeeds under the same valid provenance. Evidence: `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5-provenance-proof/cli/2026-04-18T07-09-14-811Z-a4cecd59/manifest.json`.

## Validation
- [x] `npm run generate:manifest-types`.
- [x] `npx vitest run orchestrator/tests/Manifest.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/ProviderLinearChildLaneShell.test.ts orchestrator/tests/ProviderLinearChildStreamShell.test.ts`.
- [x] `npm run build`.
- [ ] Live parent-manifest provenance check shows non-null persisted tuple.
- [x] Live same-issue child-stream proof completed cleanly.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [ ] Remaining repo review/handoff gates completed before `In Review`.

## Progress Log
- 2026-04-18: provider-worker turn started from `Ready`, created one workpad comment, moved the issue to `In Progress`, recorded `parallelize_now`, and launched same-issue child lane `docs-packet`.
- 2026-04-18: same-turn docs child lane completed successfully at `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5-docs-packet/cli/2026-04-18T06-47-21-165Z-f43e496c/manifest.json`, satisfying the required child-lane success proof for the turn. Parent rejected the patch because it drifted beyond `CO-244` and missed the actual `provider_launch_source` plus child-lane/child-stream contract.
- 2026-04-18: parent implementation added `provider_launch_source` to the manifest schema and runtime tuple, updated provider-worker manifest bootstrap/backfill logic, tightened provider-worker context matching to require `control-host` launch-source parity, and extended focused regressions across manifest, provider-worker context, child-lane, and child-stream paths.
- 2026-04-18: targeted tests and build passed, but the live shared-root parent manifest still shows `provider_launch_source=null`; parent lane must finish the live write-through proof before handoff.
