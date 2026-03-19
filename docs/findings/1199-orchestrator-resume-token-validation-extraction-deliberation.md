# 1199 Deliberation - Orchestrator Resume Token Validation Extraction

## Decision

Open `1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction` as the next bounded Symphony-aligned lane after `1198`.

## Why This Seam

After `1198`, the remaining private helpers in `orchestrator.ts` are mostly thin pass-through wrappers except for `validateResumeToken(...)`, which still owns:

- resume token file-read behavior
- missing-token validation semantics
- token mismatch validation semantics

That makes it the smallest truthful next seam. It is a self-contained behavioral contract with filesystem I/O and explicit error semantics already injected into the extracted resume-preparation shell.

## Keep Out of Scope

- runtime selection or runtime-manifest mutation behavior
- the resume pre-start failure persistence callback
- public `start()`, `resume()`, `status()`, or `plan()` behavior
- route-adapter, control-plane, or run-lifecycle orchestration

## Test Focus

- dedicated resume-token validation helper coverage for:
  - successful token validation
  - missing token rejection
  - mismatch rejection
- adjacent `OrchestratorResumePreparationShell` coverage proving callers still behave unchanged
- no widening into resume lifecycle or runtime selection internals
