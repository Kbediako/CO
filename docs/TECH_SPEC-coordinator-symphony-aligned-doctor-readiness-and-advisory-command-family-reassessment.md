# TECH_SPEC: Coordinator Symphony-Aligned Doctor Readiness And Advisory Command Family Reassessment

## Scope

Read-only reassessment of the broader doctor command family after `1245` froze the remaining delegation-setup pocket.

## In-Scope Files

- `bin/codex-orchestrator.ts` (`handleDoctor(...)`)
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/doctorUsage.ts`
- `orchestrator/src/cli/doctorIssueLog.ts`
- adjacent focused doctor tests if needed for ownership verification

## Requirements

1. Reinspect the broader doctor readiness and advisory command family for a truthful next bounded seam.
2. Confirm whether command-entry orchestration, readiness aggregation, usage/advisory policy, and issue-log persistence are already split correctly on the current tree.
3. If no real seam remains, close the lane as an explicit no-op freeze instead of inventing another extraction.
4. Keep the lane docs-first and read-only unless a concrete implementation seam is confirmed.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `go`: a concrete bounded implementation seam is identified with exact candidate files and a clear reason it is not just top-level command glue
- `freeze`: no truthful doctor-family seam remains and the reassessment closes explicitly
