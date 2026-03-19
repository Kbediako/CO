# Findings: 1185 Orchestrator Execution Mode Policy Extraction Deliberation

## Decision

- Proceed with a bounded `1185` lane for the remaining execution-mode policy block in `orchestratorExecutionRouter.ts`.

## Why This Slice

- `1184` already removed the route decision shell, so the remaining non-trivial router-local logic is now the execution-mode policy block.
- The two policy helpers are cohesive and small, which makes this a truthful next seam without reopening routing-shell or executor internals.
- This keeps the router on the Symphony-aligned path toward a thinner public boundary with separated policy and execution concerns.

## In Scope

- `requiresCloudOrchestratorExecution(...)`
- `determineOrchestratorExecutionMode(...)`
- focused regression coverage for unchanged execution-mode policy semantics

## Out of Scope

- route decision shell behavior
- route-state assembly or runtime selection
- cloud/local route shell internals
- orchestrator executor lifecycle behavior

## Review Posture

- Local read-only review approves this as the next truthful seam after `1184`.
- The lane stays intentionally small: extract policy only, keep the router’s public export surface stable, and leave the post-selection execution shell untouched.
