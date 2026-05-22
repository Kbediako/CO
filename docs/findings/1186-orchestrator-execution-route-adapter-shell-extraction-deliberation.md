# Findings: 1186 Orchestrator Execution Route Adapter Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1186` lane for the route-adapter shell still embedded in `orchestrator.ts`.

## Why This Slice

- `1185` completed the router-local execution-mode policy split, so the next cohesive routing seam is now the callback/adaptation shell in `CodexOrchestrator`.
- The `createTaskManager(...)` and `executePipeline(...)` cluster is small enough to extract truthfully without reopening broader run lifecycle behavior.
- This keeps the Symphony-aligned progression moving from router-local separations into the remaining orchestrator-local routing surface.

## In Scope

- `createTaskManager(...)`
- `executePipeline(...)`
- route-adapter wiring passed into `createRunLifecycleTaskManager(...)`
- focused routing regression coverage for unchanged adapter semantics

## Out of Scope

- `performRunLifecycle(...)`
- resume/start orchestration
- lifecycle registration or manifest bootstrapping
- router policy helpers
- cloud/local route shell internals

## Review Posture

- Local read-only review approves this as the next truthful seam after `1185`.
- Docs-review is explicitly overridden for registration in this turn because the lane already has a bounded local scout decision plus deterministic docs-first guards, and no implementation edits are being shipped in this registration commit.
