# 1198 Deliberation - Orchestrator Runtime Selection Manifest Mutation Extraction

## Decision

Open `1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction` as the next bounded Symphony-aligned lane after `1197`.

## Why This Seam

After `1197`, all public command-local shells in `orchestrator.ts` delegate through bounded helpers. The remaining shared reusable behavior still owned by `orchestrator.ts` is the runtime-manifest mutation pair:

- `applyRequestedRuntimeMode(...)`
- `applyRuntimeSelection(...)`

That pair is cohesive and bounded:

- requested-mode manifest mutation
- selected-mode manifest mutation
- provider assignment
- runtime-fallback assignment

It is also already reused across multiple extracted services, making it a stronger next seam than another public command-local extraction.

## Keep Out of Scope

- runtime mode or runtime selection resolution logic
- `validateResumeToken(...)`
- public `start()`, `resume()`, `status()`, or `plan()` behavior
- route-adapter or run-lifecycle orchestration

## Test Focus

- dedicated mutation-helper coverage for requested-mode and selected-mode manifest writes
- adjacent start/resume/route-state coverage proving callers still behave unchanged
- no widening into runtime resolution internals
