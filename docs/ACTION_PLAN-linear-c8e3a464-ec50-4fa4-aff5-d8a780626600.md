# ACTION_PLAN: CO-403 provider-worker retry recovery for completed child lanes and stale proof locks

## Added by Docs Packet 2026-04-27

## Summary
- Goal: Shape CO-403, so the parent implementation can recover already-completed same-issue child lanes during provider-worker retries and reclaim stale orphaned proof locks without weakening fail-closed enforcement.
- Scope: Docs-first packet only in this child lane; parent lane owns source/test edits, Linear/workpad/PR lifecycle, review, and validation.
- Assumptions: The embedded issue text is authoritative; the source payload path referenced by the parent run is absent in this child checkout; `tasks/specs/...` is the scoped TECH_SPEC path for this packet.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `parallelize_now`, `parallelization_launch_missing`, `provider-linear-worker-proof.json.lock`, `provider-linear-worker-proof.json`, `co-status`, `providerLinearWorkerRunner.ts`, `withProviderLinearWorkerProofLock`, `PROVIDER_LINEAR_WORKER_PROOF_LOCK_RETRY`, `orchestrator/src/persistence/lockFile.ts`, same-issue child lane, pending parent acceptance, stale orphaned proof lock.
- Not done if: Retry still loops on `parallelization_launch_missing` after the child lane succeeded; stale proof lock blocks indefinitely; manual lock deletion/proof edits are required; unrelated successful child lanes satisfy enforcement.
- Pre-implementation issue-quality review: The issue is not just a lock-file bug and not just a child-lane replay bug; implementation must cover both retry child-lane recovery and stale proof-lock recovery while preserving proof/status truthfulness.
- Fallback / refactor decision: This task touches stale/cached proof and lock seams. Remove stale attempt-local missing-launch behavior, remove stale snapshot projection for recovered state, and justify retaining stale-lock recovery as a durable lock-file safety contract.
- Durable retention evidence: `provider proof lock stale recovery` must be documented by implementation through an explicit stale timeout, live-lock keepalive, and concurrent writer serialization tests.
- Large-refactor check: Do not use CO-403 to perform CO-400 current-state authority consolidation. A narrow fix is acceptable only if it is active-decision-lineage-bound and leaves broader authority work out of scope.

## Milestones & Sequencing
1. Confirm existing proof/child-lane lineage data and lock metadata.
2. Implement active-decision same-issue child-lane recovery before `parallelization_launch_missing` classification.
3. Implement stale proof-lock timeout recovery while preserving live-lock keepalive and exclusive proof writes.
4. Update proof and `co-status` projection to expose recovered child-lane and stale-lock state truthfully.
5. Add focused positive, negative, stale-lock, concurrent-writer, and status/proof tests.
6. Run only scoped validation first, then parent-owned broader gates as needed for PR handoff.

## Dependencies
- `providerLinearWorkerRunner.ts`
- `withProviderLinearWorkerProofLock`
- `PROVIDER_LINEAR_WORKER_PROOF_LOCK_RETRY`
- `orchestrator/src/persistence/lockFile.ts`
- `provider-linear-worker-proof.json`
- `provider-linear-worker-proof.json.lock`
- `co-status`
- Existing same-issue child-lane proof artifacts and active parallelization decision metadata.

## Validation
- Checks / tests: Focused provider-worker retry regression for CO-400 shape; negative lineage/failure/missing-child cases; stale proof-lock recovery; concurrent proof writer guard; proof/`co-status` recovered-state assertions. Parent lane decides any broader suite after implementation.
- Rollback plan: Revert CO-403 implementation and packet updates together if recovery weakens fail-closed child-lane enforcement, permits unrelated child-lane attribution, or corrupts proof sidecars.

## Risks & Mitigations
- Risk: A successful but unrelated child lane is misattributed. Mitigation: Require issue id, stream, turn lineage, and parent decision lineage to match.
- Risk: Stale-lock recovery races a live writer. Mitigation: Keep live locks fresh with keepalive updates and preserve exclusive writer tests.
- Risk: `co-status` hides recovery behind old snapshots. Mitigation: Add explicit recovered-state proof/status assertions.
- Risk: CO-403 expands into CO-400 authority work. Mitigation: Keep the implementation bounded to retry recovery, stale-lock recovery, and projection truthfulness.

## Approvals
- Reviewer: Pending parent lane review.
- Date: 2026-04-27
