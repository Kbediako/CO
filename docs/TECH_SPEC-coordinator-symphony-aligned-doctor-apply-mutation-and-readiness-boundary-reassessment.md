# TECH_SPEC: Coordinator Symphony-Aligned Doctor Apply Mutation And Readiness Boundary Reassessment

## Scope

Docs-first reassessment of the remaining `handleDoctor(...)` surface after `1249` extracted `setup`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/devtoolsSetup.ts`
- `orchestrator/src/cli/delegationSetup.ts`
- `orchestrator/src/cli/skills.ts`
- existing doctor/setup command-surface tests only as evidence anchors

## Requirements

1. Reassess the current `handleDoctor(...)` block after the `setup` extraction reduced top-level CLI scope.
2. Determine whether readiness/advisory output and `--apply` mutation now separate into a bounded shell seam or still remain mixed across shared setup owners.
3. Record a truthful result:
   - `go`: register the next bounded implementation slice only if a concrete seam is now local and owned
   - `freeze`: explicitly stop instead of forcing an extraction
4. Keep this lane docs-only unless current evidence shows a clearly bounded follow-on.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the remaining doctor apply/readiness boundary is explicitly classified as `go` or `freeze`
- `abort`: local evidence is too ambiguous to distinguish between a bounded seam and same-owner glue
