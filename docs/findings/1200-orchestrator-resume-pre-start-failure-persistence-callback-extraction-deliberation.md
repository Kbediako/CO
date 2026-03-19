# 1200 Deliberation - Orchestrator Resume Pre-Start Failure Persistence Callback Extraction

## Decision

Open `1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction` as the next bounded Symphony-aligned lane after `1199`.

## Why This Seam

After `1199`, the remaining private helpers in `orchestrator.ts` are thin pass-through wrappers, while the inline `resume()` `onStartFailure` callback still owns a self-contained behavioral contract:

- finalize failed status as `resume-pre-start-failed`
- force persistence of the failed manifest
- warn if persistence fails

That makes it the smallest truthful next seam. It is already passed into the extracted control-plane lifecycle shell, but the callback body still lives in the orchestrator entrypoint.

## Keep Out of Scope

- runtime selection or resume-token validation behavior
- public `start()`, `resume()`, `status()`, or `plan()` behavior
- control-plane lifecycle sequencing itself
- route-adapter or run-lifecycle orchestration
- changing the existing persisted failure contract: `status = failed`, `status_detail = resume-pre-start-failed`, original startup error still rethrown

## Test Focus

- dedicated helper coverage for:
  - failed-status detail assignment
  - forced persistence
  - warning on persistence failure
- adjacent `OrchestratorControlPlaneLifecycleShell` coverage proving callback invocation semantics stay unchanged
- no widening into broader resume lifecycle or route behavior
