# Findings: 1182 Orchestrator Local Route Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1182` lane for the remaining local-route shell centered on `runLocalExecutionLifecycleShell(...)` in `orchestratorExecutionRouter.ts`.

## Why This Slice

- `1181` removed the cloud-route shell, leaving the local-route wrapper as the next dense route-local cluster inside the router.
- The inline local block is cohesive: it owns runtime-fallback summary append, local auto-scout env forwarding, local pipeline dispatch, and guardrail recommendation append.
- This is smaller and more truthful than reopening route-state resolution, execution-mode policy, or lifecycle/executor internals.

## In Scope

- the local-route shell currently implemented by `runLocalExecutionLifecycleShell(...)`
- runtime-fallback summary append before local lifecycle start
- local auto-scout env forwarding
- local pipeline dispatch through `executeOrchestratorLocalPipeline(...)`
- guardrail recommendation append after finalize
- focused regressions for runtime-fallback summary behavior, auto-scout env propagation, local execution dispatch, and guardrail recommendation append

## Out of Scope

- route-state resolution
- cloud-route shell
- execution-mode policy helpers
- shared `failExecutionRoute(...)` contract
- lifecycle runner or local executor internals
- broader router refactors beyond the bounded local-route shell

## Review Posture

- Local read-only review approves this as the next truthful seam after `1181`.
- The lane stays aligned with the Symphony shape by carving the remaining local-route wrapper out of the router without reopening route-state or cloud-route ownership.
