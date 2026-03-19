# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Persistence Callback Extraction

- Date: 2026-03-15
- Owner: Codex (top-level agent)
- Task: `1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction`
- Status: Draft

## Background

`1195` extracted the resume-preparation shell and `1199` extracted resume-token validation. The remaining truthful resume-local behavioral seam in `orchestrator.ts` is the inline `onStartFailure` callback that finalizes failed resume state, forces persistence, and warns on persistence failure.

## Scope

- extract the inline resume pre-start failure persistence callback from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - finalize failed status with `resume-pre-start-failed`
  - forced manifest persistence
  - warning emission when persistence fails
- preserve exact callback behavior passed into `orchestratorControlPlaneLifecycleShell`

## Out of Scope

- runtime selection or resume-token validation behavior
- public `start()`, `resume()`, `status()`, or `plan()` shell behavior
- control-plane lifecycle sequencing itself
- route-adapter or run-lifecycle orchestration

## Proposed Approach

1. Introduce one bounded helper under `orchestrator/src/cli/services/` for resume pre-start failure persistence.
2. Move the `finalizeStatus(...)`, `persistManifest(...)`, and warning behavior into that helper.
3. Keep `orchestrator.ts` as the public entrypoint while delegating only the callback body.
4. Keep `orchestratorControlPlaneLifecycleShell` unchanged except for consuming the extracted callback contract if needed.
5. Add or adapt focused tests around failed-status detail, forced persistence, and warning behavior.

## Validation

- standard docs-first guards before implementation
- focused helper regressions during implementation:
  - failed-status detail set to `resume-pre-start-failed`
  - forced persistence attempted
  - warning emitted when persistence fails
  - adjacent control-plane lifecycle behavior staying unchanged
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing failed-status detail or persistence force behavior would create resume-status regressions
- widening into broader control-plane lifecycle work would break the bounded seam
- leaving warning behavior partially inlined would keep `orchestrator.ts` coupled to a reusable failure-persistence callback contract
