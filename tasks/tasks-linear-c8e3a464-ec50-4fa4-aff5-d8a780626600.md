# Task List: CO-403 provider-worker retry recovery for completed child lanes and stale proof locks

## Added by Docs Packet 2026-04-27

## Context
- MCP Task ID: linear-c8e3a464-ec50-4fa4-aff5-d8a780626600
- Primary PRD: docs/PRD-linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- TECH_SPEC: tasks/specs/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- ACTION_PLAN: docs/ACTION_PLAN-linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- Summary of scope: Repair provider-worker retry recovery for completed same-issue child lanes and stale proof locks while preserving fail-closed `parallelize_now` enforcement and truthful proof/`co-status` surfaces.

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence.

### Evidence Gates
- [x] Issue-quality review captured (pre-implementation) - Evidence: `tasks/specs/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md` carries the issue-shaping contract, protected terms, wrong interpretations to reject, non-goals, parity matrix, and `Not done if` clauses from the embedded source.
- [x] Fallback / refactor decision captured (pre-implementation) - Evidence: `tasks/specs/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md` chooses `remove fallback` for stale attempt-local child-lane proof, `justify retaining fallback` for durable stale-owner proof-lock recovery, and `remove fallback` for stale proof/status projection.
- [x] Durable fallback retention evidence captured - Evidence: `tasks/specs/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md` defines `provider proof lock stale recovery` as a durable lock-file safety contract requiring an explicit stale timeout, live-lock keepalive, and concurrent writer serialization tests.
- [ ] Standalone review approval captured (pre-implementation) - Evidence: Parent lane to run if required before implementation.
- [ ] Docs-review manifest captured (pre-implementation) - Evidence: Parent lane to run if required; this child lane was scoped to packet creation only.
- [ ] Implementation review manifest captured (post-implementation) - Evidence: Parent lane to capture after code/test changes.

### Progress Log (continuity)
- 2026-04-27: Created docs-first packet from embedded CO-403 issue text only. Source payload path was absent in this child checkout, so the prompt text is the source of truth.
- 2026-04-27: Registered scoped TECH_SPEC path, task checklist, `.agent` mirror, `tasks/index.json`, and `docs/TASKS.md` snapshot. No Linear/GitHub/PR lifecycle surfaces inspected or mutated.

## Parent Tasks
1. Recover active-decision child-lane completion on provider-worker retry.
   - Files: `providerLinearWorkerRunner.ts` and existing same-issue child-lane proof readers.
   - Commands: Focused provider-worker retry tests selected by parent.
   - Acceptance: Retry continues to parent patch acceptance when the child lane launched for the active `parallelize_now` decision in the prior attempt, completed successfully, and is pending parent acceptance.
   - [ ] Status: Pending parent implementation.
2. Preserve fail-closed enforcement for invalid child-lane proof.
   - Files: `providerLinearWorkerRunner.ts` and focused test fixtures.
   - Commands: Focused negative tests for no launch, failed child, unrelated child, older child, and lineage mismatch.
   - Acceptance: `parallelization_launch_missing` or equivalent fail-closed classification remains for invalid proof.
   - [ ] Status: Pending parent implementation.
3. Recover stale orphaned proof locks without corrupting proof sidecars.
   - Files: `withProviderLinearWorkerProofLock`, `PROVIDER_LINEAR_WORKER_PROOF_LOCK_RETRY`, `orchestrator/src/persistence/lockFile.ts`.
   - Commands: Focused stale-lock and concurrent writer tests.
   - Acceptance: Stale/dead owner locks are reclaimed through explicit validation; live concurrent writers remain serialized and `provider-linear-worker-proof.json` is not corrupted.
   - [ ] Status: Pending parent implementation.
4. Surface recovered truth in proof and status.
   - Files: `provider-linear-worker-proof.json` writers/readers and `co-status` projection code.
   - Commands: Focused proof/status projection assertions.
   - Acceptance: Recovered child-lane and stale-lock states are visible and not hidden behind stale snapshots.
   - [ ] Status: Pending parent implementation.
5. Parent-owned review and handoff.
   - Files: Parent lane owned manifests, workpad, PR, and review artifacts.
   - Commands: Parent lane to choose scoped and broader validation gates.
   - Acceptance: Parent captures review/validation evidence and handles Linear/GitHub lifecycle.
   - [ ] Status: Pending parent lane.

## Relevant Files
- docs/PRD-linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- tasks/specs/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- docs/ACTION_PLAN-linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- tasks/tasks-linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- .agent/task/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md
- tasks/index.json
- docs/TASKS.md

## Notes
- PRD/TECH_SPEC/ACTION_PLAN Requirements: Complete for this docs packet. The scoped TECH_SPEC path is `tasks/specs/linear-c8e3a464-ec50-4fa4-aff5-d8a780626600.md`; no `docs/TECH_SPEC...` file was created because it is outside the declared child-lane file scope.
- Intent checksum / parity matrix status: Captured in PRD, TECH_SPEC, and ACTION_PLAN.
- Approvals Needed: Parent lane review before implementation.
- Links: Source anchor from parent prompt: `ctx:sha256:2891fad4a006dbd008954246bf08d58e33dc4da0c33723f4e2d3006f7d4bbbc3#chunk:c000001`.
- Subagent usage (required): This is already a bounded same-issue child lane; no nested delegation was launched from this docs-only packet scope.
