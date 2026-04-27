# PRD: CO-403 provider-worker retry recovery for completed child lanes and stale proof locks

## Added by Docs Packet 2026-04-27

## Summary
- Problem Statement: Provider-worker retries can fail with `parallelization_launch_missing` even when the required same-issue child lane already launched for the active `parallelize_now` decision, completed successfully, and is waiting for parent patch acceptance. Separately, stale orphaned `provider-linear-worker-proof.json.lock` files can block proof updates indefinitely.
- Desired Outcome: Retries recover truthful same-issue child-lane completion state, stale proof locks are recoverable through an explicit policy, and fail-closed behavior remains intact for missing, failed, unrelated, older, or misattributed child lanes.

## User Request Translation (Context Anchor)
- User intent / needs: Make CO-403 repair the provider-worker retry path that loops on `parallelization_launch_missing` after a prior attempt's same-issue child lane succeeded, while also making proof sidecar writes resilient to stale orphaned lock files without allowing concurrent writers to corrupt `provider-linear-worker-proof.json`.
- Success criteria / acceptance: Retries continue to parent patch acceptance when the lineage-bound child lane succeeded; retries still fail closed for no launch, failed child, unrelated issue/stream/turn/decision lineage, or older child lanes; stale `provider-linear-worker-proof.json.lock` files recover only after an explicit stale-lock timeout while live locks are kept fresh; tests cover the CO-400 shape and lock recovery; `co-status` and proof surfaces expose recovered state truthfully.
- Constraints / non-goals: Do not disable `parallelize_now` enforcement, launch duplicate no-op child lanes, fold unrelated CO-400 current-state authority work into this bug, weaken child-lane ownership, or weaken fail-closed handling for genuinely missing child lanes.

## Intent Checksum
- Exact user wording / phrases to preserve: "Make provider-worker retries recover truthfully when the required same-issue child lane has already completed successfully"; "proof-lock handling recover stale orphaned locks after failed/restarted attempts"; "pending parent acceptance"; "stale orphaned proof lock".
- Protected terms / exact artifact and surface names: `parallelize_now`, `parallelization_launch_missing`, `provider-linear-worker-proof.json.lock`, `provider-linear-worker-proof.json`, `co-status`, `providerLinearWorkerRunner.ts`, `withProviderLinearWorkerProofLock`, `PROVIDER_LINEAR_WORKER_PROOF_LOCK_RETRY`, `orchestrator/src/persistence/lockFile.ts`, same-issue child lane, pending parent acceptance, stale orphaned proof lock.
- Nearby wrong interpretations to reject: Counting any successful child lane regardless of issue id, stream, turn lineage, or parent decision lineage; deleting locks manually; editing proof JSON by hand; treating stale snapshots as authoritative; weakening `parallelize_now`; relaunching duplicate no-op child lanes; folding CO-400 current-state authority changes into CO-403.

## Parity / Alignment Matrix
- Current truth: Attempt-local proof handling can miss a prior successful same-issue child lane and report `parallelization_launch_missing`; a leaked `provider-linear-worker-proof.json.lock` can block proof updates indefinitely.
- Reference truth: Same-issue child-lane enforcement should be fail-closed, but retries must recognize a child lane launched for the active parallelization decision once it completed and is pending parent acceptance.
- Target truth / intended delta: Recovery accepts only lineage-matched completed child-lane proof for the active issue/stream/turn/decision, records that state in proof and `co-status`, and uses stale-lock timeout recovery with live-lock keepalive before reclaiming orphaned proof locks.
- Explicitly out-of-scope differences: Broader CO-400 current-state authority, new child-lane launch strategy, duplicate no-op lanes, manual proof repair workflows, Linear/GitHub lifecycle changes, and source/test changes in this docs packet.

## Not Done If
- A repro can still loop on `parallelization_launch_missing` after a same-issue child lane has already succeeded.
- A leaked proof lock can block proof updates indefinitely without stale-owner recovery.
- The fix relies on manual lock deletion or manual proof JSON edits.
- Any successful child lane is counted regardless of issue id, stream, turn lineage, or parent decision lineage.

## Goals
- Recover completed same-issue child-lane state during resumed/retried provider-worker attempts when it belongs to the active `parallelize_now` decision and is pending parent acceptance.
- Preserve fail-closed behavior for missing launches, failed child lanes, unrelated or older child lanes, and lineage mismatches.
- Add explicit stale proof-lock recovery for `provider-linear-worker-proof.json.lock` without permitting concurrent proof writers.
- Keep `provider-linear-worker-proof.json` and `co-status` truthful about recovered child-lane and proof-lock state.

## Non-Goals
- Disable or bypass `parallelize_now` enforcement.
- Launch duplicate no-op child lanes to satisfy enforcement.
- Broaden into unrelated CO-400 current-state authority repairs.
- Change Linear state, workpads, PR lifecycle, source code, or tests in this docs-packet child lane.

## Stakeholders
- Product: CO provider-worker operators relying on accurate retry and status behavior.
- Engineering: Codex Orchestrator maintainers responsible for provider-worker child lanes, proof sidecars, locking, and status projection.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: CO-400-shaped retry fixture proceeds to parent patch acceptance after prior child-lane success; stale lock recovery fixture reclaims dead-owner locks while concurrent writers remain serialized; `co-status` and proof assertions show recovered truth.
- Guardrails / Error Budgets: Zero tolerance for unrelated child-lane attribution, hidden stale snapshots, proof JSON corruption, manual recovery requirements, or weakened missing-child fail-closed errors.

## User Experience
- Personas: Provider-worker operator, parent-lane orchestrator, and reviewer validating proof/status evidence.
- User Journeys: A provider-worker attempt launches a same-issue child lane, fails or restarts before parent acceptance, resumes, recognizes the completed child lane as pending parent acceptance, reclaims only stale orphaned proof locks, and continues without hiding recovery behind stale state.

## Technical Considerations
- Architectural Notes: Implementation should focus on `providerLinearWorkerRunner.ts`, `withProviderLinearWorkerProofLock`, and `orchestrator/src/persistence/lockFile.ts`; proof/status projection must report the recovered child-lane and lock state rather than relying only on stale attempt-local snapshots.
- Dependencies / Integrations: Existing same-issue child-lane proof artifacts, provider-worker proof sidecar, lock-file persistence, and `co-status` projection. This docs packet does not inspect or mutate Linear/GitHub lifecycle surfaces.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decisions:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `providerLinearWorkerRunner.ts` | Attempt-local child-lane launch proof treats already-completed same-issue child lanes as missing. | `remove fallback` | CO-403 | Retried provider-worker attempt after prior child-lane success and before parent acceptance. | 2026-04-27 | 2026-04-27 | Immediate removal in CO-403 | Lineage-bound completed child-lane proof replaces stale attempt-local missing-launch classification. | CO-400-shaped retry regression covering `parallelize_now`, prior child success, retry acceptance path, and fail-closed unrelated/failed/missing cases. |
| `withProviderLinearWorkerProofLock` / `orchestrator/src/persistence/lockFile.ts` | Stale orphaned `provider-linear-worker-proof.json.lock` can block proof sidecar writes indefinitely. | `justify retaining fallback` | CO-403 | Proof lock mtime exceeds the configured stale timeout after a failed/restarted attempt. | 2026-04-27 | 2026-04-27 | Durable lock-file safety contract | Not removed; retained as explicit stale-lock timeout recovery while live writers keep locks fresh. | Stale proof-lock recovery test plus concurrent writer serialization/corruption guard. |
| `co-status` / `provider-linear-worker-proof.json` | Status/proof projection can hide recovered state behind stale snapshots. | `remove fallback` | CO-403 | Retry recovers a completed child lane or stale proof lock. | 2026-04-27 | 2026-04-27 | Immediate removal in CO-403 | Proof and status surfaces emit recovered state and recovery reason truthfully. | Focused proof/status assertions for recovered child-lane and stale-lock recovery state. |

- Durable retention evidence: The stale-lock recovery path is retained as a durable lock-file safety contract, not a temporary bypass. It must prove stale-timeout recovery, live-lock keepalive, and exclusive writer behavior before reclaiming a lock.
- Large-refactor check: A large provider-worker current-state authority refactor is explicitly out of scope for CO-403. A narrow fix is acceptable only because CO-403 is limited to active-decision child-lane retry recovery, stale proof-lock recovery, and truthful proof/status projection; broader CO-400 authority work must remain separate.

## Open Questions
- Does `orchestrator/src/persistence/lockFile.ts` need any additional shared stale-lock diagnostics beyond the provider-worker-specific stale timeout and keepalive policy?
- Which proof field should mark a recovered completed child lane as pending parent acceptance without making it look accepted before the parent applies the patch?

## Approvals
- Product: Pending parent lane review.
- Engineering: Pending parent lane review.
- Design: Not applicable.
