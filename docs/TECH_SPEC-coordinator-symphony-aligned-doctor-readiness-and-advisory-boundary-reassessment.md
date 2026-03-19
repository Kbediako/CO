# TECH_SPEC: Coordinator Symphony-Aligned Doctor Readiness And Advisory Boundary Reassessment

## Context

The current Symphony-aligned control, delegation, standalone-review, orchestrator, and RLM runner pockets have all been reduced or frozen. The broader doctor command family still appears mixed: `handleDoctor(...)` owns CLI entry orchestration, `doctor.ts` owns readiness inspection, `doctorUsage.ts` owns usage telemetry and recommendation policy, `doctorIssueLog.ts` owns issue-log persistence, and the helper utilities below feed that surface.

## Requirements

1. Reinspect the broader doctor readiness and advisory boundary across:
   - `bin/codex-orchestrator.ts` (`handleDoctor(...)`)
   - `orchestrator/src/cli/doctor.ts`
   - `orchestrator/src/cli/doctorUsage.ts`
   - `orchestrator/src/cli/doctorIssueLog.ts`
   - `orchestrator/src/cli/utils/devtools.ts`
   - `orchestrator/src/cli/utils/codexCli.ts`
   - `orchestrator/src/cli/utils/cloudPreflight.ts`
   - `orchestrator/src/cli/utils/optionalDeps.ts`
   - adjacent focused doctor tests if needed
2. Confirm whether any concrete bounded implementation seam still exists on the current tree.
3. If no real seam remains, close the lane as an explicit broader freeze and no-op result instead of inventing another extraction.
4. Keep the lane read-only except for docs, task, and mirror updates required to register and close the reassessment.
5. Keep unrelated CLI families out of scope unless new evidence proves they are the next truthful lane.
6. Prefer the smallest truthful next seam within the broader doctor command family instead of assuming the utilities alone define the boundary.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a concrete bounded implementation seam is identified with exact candidate files and a clear reason it is not just top-level advisory glue or a utils-only symmetry move
- `no-go`: no truthful broader doctor seam remains and the reassessment closes as an explicit freeze and stop signal
