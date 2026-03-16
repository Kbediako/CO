# PRD: Coordinator Symphony-Aligned Doctor Readiness And Advisory Command Family Reassessment

## Summary

With `1245` frozen, the next truthful broader subsystem is the doctor readiness and advisory command family.

## Problem

The current doctor command surface still spans several adjacent ownership domains:

- `bin/codex-orchestrator.ts` (`handleDoctor(...)`)
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/doctorUsage.ts`
- `orchestrator/src/cli/doctorIssueLog.ts`

Those files may already represent the correct top-level split, but the command family is broad enough that the next truthful seam is not obvious without a bounded reassessment. The goal is to avoid reopening exhausted delegation-setup symmetry and instead verify whether a real doctor-family implementation lane still exists.

## Goal

Reassess the doctor readiness and advisory command family and record whether an exact bounded implementation seam still exists there, or whether the truthful outcome is another no-op freeze.

## Non-Goals

- reopening the frozen delegation-setup pocket after `1245`
- changing live doctor behavior in a docs-first reassessment lane
- assuming file size alone proves a required extraction
- widening into unrelated CLI families outside the doctor/readiness/advisory command surface

## Success Criteria

- docs-first artifacts capture the broader doctor command-family reassessment boundary
- the lane identifies either:
  - an exact next truthful implementation seam, or
  - an explicit no-op freeze with concrete reasons
- the reassessment keeps readiness-source ownership, advisory messaging, and issue-log boundaries explicit
