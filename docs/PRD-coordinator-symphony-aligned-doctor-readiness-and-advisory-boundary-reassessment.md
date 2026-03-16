# PRD: Coordinator Symphony-Aligned Doctor Readiness And Advisory Boundary Reassessment

## Summary

With the current RLM runner pocket frozen after `1239`, the next truthful broader subsystem is the `doctor.ts` readiness and advisory family.

## Problem

The doctor family still spans a large top-level contract:

- `bin/codex-orchestrator.ts` (`handleDoctor(...)`)
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/doctorUsage.ts`
- `orchestrator/src/cli/doctorIssueLog.ts`
- `orchestrator/src/cli/utils/devtools.ts`
- `orchestrator/src/cli/utils/codexCli.ts`
- `orchestrator/src/cli/utils/cloudPreflight.ts`
- `orchestrator/src/cli/utils/optionalDeps.ts`

The current doctor command family appears to span several distinct concerns behind one command surface: readiness inspection in `doctor.ts`, usage and recommendation policy in `doctorUsage.ts`, issue-log persistence in `doctorIssueLog.ts`, and CLI entry orchestration in `handleDoctor(...)`, all over the existing utility helpers. Some of that may already be correctly owned by extracted helpers, but the broader family is still mixed enough that the next truthful seam is not obvious without a bounded reassessment.

## Goal

Reassess the broader doctor readiness and advisory boundary and record whether an exact bounded implementation seam still exists there, or whether the correct result is a broader no-op freeze or a narrower next-slice decision.

## Non-Goals

- reopening the exhausted RLM runner family
- changing live doctor behavior in a docs-first reassessment lane
- treating file size alone as proof that an extraction must exist
- forcing a utils-only split if the real seam is at the broader doctor command surface
- widening into unrelated CLI families outside the doctor/readiness/advisory pocket

## Success Criteria

- docs-first artifacts capture the broader doctor readiness and advisory reassessment boundary
- the lane identifies either:
  - an exact next truthful implementation seam, or
  - an explicit no-op freeze with concrete reasons
- the reassessment keeps readiness-source ownership, advisory messaging, and cloud/collab posture risks explicit
