---
id: 20260316-1240-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment
title: Coordinator Symphony-Aligned Doctor Readiness And Advisory Boundary Reassessment
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: low
related_prd: docs/PRD-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment.md
related_tasks:
  - tasks/tasks-1240-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1239` froze the remaining RLM runner boundary and local plus bounded scout inspection identified the broader doctor command family (`handleDoctor(...)`, `doctor.ts`, `doctorUsage.ts`, `doctorIssueLog.ts`, and underlying readiness helpers) as the next truthful advisory subsystem to reassess. Evidence: `docs/findings/1240-doctor-readiness-and-advisory-boundary-reassessment-deliberation.md`, `out/1239-coordinator-symphony-aligned-rlm-runner-remaining-boundary-freeze-reassessment/manual/20260316T101919Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Closeout completed. Confirmed that the broader doctor family is mostly truthful command-level orchestration and that the smallest real remaining seam is the duplicated TOML MCP server-entry detector shared between `doctor.ts` and `delegationSetup.ts`, so `1240` closes by pointing directly to the bounded `1241` extraction lane. Evidence: `out/1240-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment/manual/20260316T111040Z-closeout/00-summary.md`, `out/1240-coordinator-symphony-aligned-doctor-readiness-and-advisory-boundary-reassessment/manual/20260316T111040Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The current Symphony-aligned RLM runner family is frozen after `1239`. The broader doctor command family still appears mixed: `handleDoctor(...)` owns CLI entry orchestration, `doctor.ts` owns readiness inspection, `doctorUsage.ts` owns usage telemetry and recommendation policy, `doctorIssueLog.ts` owns issue-log persistence, and the helper utilities below feed that surface.

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
