# ACTION_PLAN: CO-417 recover stale provider-worker proof locks during active appserver runs

## Added by Provider Worker 2026-04-28

## Summary
- Goal: Repair active appserver provider-worker proof lock lifecycle so live proof updates recover or fail closed with actionable diagnostics instead of freezing behind stale `provider-linear-worker-proof.json.lock`.
- Scope: Docs-first packet, lock/proof source changes, focused tests, replay/fixture evidence, validation, review, and PR handoff.
- Assumptions: CO-415 fresh evidence and CO-400 recurrence are representative; CO-403 is related precedent but this issue remains a distinct active-run live proof path unless source audit proves otherwise.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-linear-worker-proof.json`, `provider-linear-worker-proof.json.lock`, `Failed to acquire provider-linear-worker proof lock after 50 attempts`, appserver provider worker, manifest heartbeat, CO-415, CO-403, CO-400, stale lock, live proof update.
- Not done if: Active appserver workers can still freeze proof behind a stale lock while manifest heartbeats continue; lock owner/age diagnostics remain opaque; recurrence requires manual cleanup; repeated stderr warnings lack an actionable owner.
- Pre-implementation issue-quality review: The task is broader than manually deleting stale locks and narrower than provider current-state authority. The implementation must cover active live proof update writes, lock diagnostics, safe recovery/classification, and focused regressions.
- Fallback / refactor decision: This touches stale lock behavior. Remove the active proof-write no-stale-diagnostic gap and justify retaining metadata-backed stale lock recovery as a durable lock safety contract.
- Durable retention evidence: Retained lock recovery must prove owner metadata, legacy token compatibility, stale timeout or age evidence, live keepalive, and concurrent writer safety.
- Large-refactor check: Defer a broad lock subsystem rewrite unless source audit shows the existing `acquireLockWithRetry` seam cannot support safe metadata and recovery.

## Milestones & Sequencing
1. Normalize branch/workpad/parallelization state and create the docs-first packet.
2. Run docs-review before implementation and record the manifest.
3. Audit `lockFile.ts` and provider proof write paths to identify the active-run stale-lock gap.
4. Accept, adapt, reject, or invalidate the same-issue tests child-lane result.
5. Implement metadata-backed stale recovery or fail-closed diagnostics while preserving live writer safety.
6. Run focused lock/provider-worker tests plus CO-415/CO-400-style replay/fixture evidence.
7. Run required gates, standalone review, elegance pass, PR attach/update, ready-review drain, and Linear review handoff.

## Dependencies
- `orchestrator/src/persistence/lockFile.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/LockFile.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- CO-415 artifact path: `.runs/linear-67a294b8-748d-4b8d-92ae-a884b2be7d63/cli/2026-04-28T08-22-13-836Z-1d5a3286/`
- CO-400 recurrence artifact path: `.runs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3/cli/2026-04-27T15-36-20-200Z-5f0a2954/events.jsonl`

## Validation
- Checks / tests: Focused lock tests; focused provider-worker stale proof-lock regression; replay/fixture check for manifest-heartbeat-plus-stale-proof shape; required repository gates.
- Rollback plan: Revert CO-417 source and packet changes together if recovery can corrupt proof JSON, hide live proof failures, or classify active writers as stale.

## Risks & Mitigations
- Risk: Recovery removes a lock owned by a live writer. Mitigation: require stale age/owner evidence and keep live locks fresh through keepalive; test active writer preservation.
- Risk: Legacy token-only lock files become unrecoverable or misclassified. Mitigation: parse legacy token payloads explicitly and keep stale recovery conservative.
- Risk: Warning spam is hidden instead of fixed. Mitigation: only suppress repeated warning loops when recovery succeeds or when a classified fail-closed diagnostic replaces them.
- Risk: Scope expands into current-state authority or queue capacity. Mitigation: keep implementation limited to proof lock lifecycle and file follow-ups for unrelated debt.

## Approvals
- Reviewer: Pending docs-review and implementation review.
- Date: 2026-04-28
