# TECH_SPEC: Coordinator Symphony-Aligned Frontend-Test CLI Boundary Reassessment Revisit

## Context

The older frontend-test shell extraction may not have exhausted the current binary-facing wrapper.

## Scope

- re-evaluate `handleFrontendTest(...)` on the current tree
- classify the remaining local ownership as `freeze` or `go`
- name the next bounded seam only if a real mixed-ownership wrapper remains

## Requirements

1. Reinspect the current frontend-test wrapper behavior in `bin/codex-orchestrator.ts`.
2. Preserve current frontend-test behavior; this lane is reassessment-only.
3. Avoid widening into lower pipeline execution or unrelated CLI families.
4. Record a truthful closeout with explicit evidence for the resulting decision.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
