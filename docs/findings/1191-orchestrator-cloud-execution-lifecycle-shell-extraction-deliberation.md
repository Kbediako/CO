# Findings: 1191 Orchestrator Cloud Execution Lifecycle Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1191` lane for the remaining private cloud execution lifecycle shell in `orchestrator.ts`.

## Why This Slice

- `1190` already removed the run-lifecycle orchestration envelope, so the next remaining class-private orchestration body is the cloud execution lifecycle shell.
- The seam is adjacent, narrow, and already aligned with an existing focused test surface.
- This continues the same Symphony-style class-thinning pattern without reopening routing policy, public lifecycle, or cloud target executor behavior.

## In Scope

- move the `executeCloudPipeline(...)` / `runCloudExecutionLifecycleShell(...)` orchestration into a bounded service helper
- preserve `runAutoScout`, `advancedDecisionEnv`, failure-detail forwarding, note ordering, and event/persister passthrough
- keep focused lifecycle regressions at the extracted shell boundary

## Out of Scope

- route-decision or execution-mode policy behavior
- public `start()` / `resume()` lifecycle behavior
- local execution lifecycle changes
- cloud target executor behavior changes

## Review Posture

- Local scout review approves this as the next truthful seam after `1190`.
- Docs-review is explicitly overridden for this registration turn because the scout already narrowed the boundary and the deterministic docs-first guards are sufficient before the implementation step.
