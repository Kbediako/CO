# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Manifest Contract

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract`
- Status: Draft

## Background

The remaining public lifecycle bug after `1165` is specific to `resume()`: the manifest is reset into a live-looking state and force-persisted before `startOrchestratorControlPlaneLifecycle(...)` succeeds. Cleanup ownership for partially started lifecycle resources already lives in `startOrchestratorControlPlaneLifecycle(...)`, so the missing contract is not cleanup. It is the persisted manifest outcome when startup never reaches readiness.

## Scope

- Narrow `resume()` pre-start failure contract in `orchestrator/src/cli/orchestrator.ts`
- Persisted manifest/status outcome when control-plane startup rejects before resumed execution begins
- One explicit failure `status_detail` marker for this boundary
- One public CLI resume regression covering the failure path

## Out of Scope

- `start()` semantics
- Shared public bootstrap helper extraction
- Control-plane startup cleanup ownership
- `performRunLifecycle(...)` or executor routing changes
- New operator-facing retry flows

## Proposed Approach

1. Wrap the `startOrchestratorControlPlaneLifecycle(...)` call inside `resume()` with a narrow failure contract.
2. On pre-start failure:
   - finalize the manifest as `failed`
   - persist an explicit `status_detail` marker such as `resume-pre-start-failed`
   - force-persist the manifest update before rethrowing
3. Keep the existing startup helper as the owner of cleanup for partially constructed lifecycle resources.
4. Extend the public resume CLI test to stub control-plane startup failure and assert the persisted manifest is not stranded as `in_progress`.

## Validation

- Focused CLI orchestrator regression for resume pre-start failure
- Standard deterministic gate bundle for the final tree
- Explicit bounded review and elegance pass

## Risks

- Swallowing or replacing the original startup error would make resume failure diagnosis worse.
- Reusing a generic failure marker would blur this contract with later execution failures.
- Touching cleanup ownership here would overlap with already-correct control-plane lifecycle boundaries.
