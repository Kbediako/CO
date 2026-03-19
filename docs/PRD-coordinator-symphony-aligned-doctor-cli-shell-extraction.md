# PRD: Coordinator Symphony-Aligned Doctor CLI Shell Extraction

## Summary

After `1250` confirmed the remaining doctor surface is still a real top-level shell, the next truthful implementation lane is to extract that doctor command shell from `bin/codex-orchestrator.ts`.

## Problem

`handleDoctor(...)` still combines doctor-specific orchestration in the top-level CLI file:

- readiness, usage, cloud-preflight, and issue-log composition
- JSON/text output shaping
- `--apply` planning and apply-mode mutation through setup modules

That is broader than the thin command-entry wrappers now left for `flow` and `setup`.

## Goal

Extract the doctor command shell behind a dedicated boundary while preserving current `doctor` CLI behavior.

## Non-Goals

- changing `doctor` semantics, flags, or output contracts
- changing the underlying implementations in `doctor.ts`, `doctorUsage.ts`, `doctorIssueLog.ts`, `skills.ts`, `delegationSetup.ts`, or `devtoolsSetup.ts`
- widening into sibling commands

## Success Criteria

- docs-first artifacts capture the bounded doctor shell seam
- the extracted shell owns doctor orchestration and output shaping
- focused doctor command-surface behavior remains parity-backed
