# PRD: Coordinator Symphony-Aligned RLM CLI Launch Shell Extraction

## Summary

After `1278` extracted the bounded RLM completion/state-reporting shell, the remaining truthful nearby seam is the binary-facing RLM launch path still inline in `handleRlm(...)` inside `bin/codex-orchestrator.ts`.

## Problem

The local `rlm` wrapper now still mixes:

- binary-facing help and shared `parseArgs(...)` ownership
- goal validation and task/env shaping
- legacy alias warning and doctor-tip UX
- inline `orchestrator.start(...)` launch orchestration and `Run started` output
- handoff into the extracted completion helper

That launch path remains broader than same-owner glue and still overlaps the surrounding CLI shell patterns.

## Goal

Extract the bounded RLM launch shell without widening into the deeper `rlmRunner.ts` runtime or re-opening the already-shipped completion helper.

## Non-Goals

- moving binary-facing help/parse ownership out of `bin/codex-orchestrator.ts`
- merging the whole `rlm` command into `startCliShell.ts`
- changing goal requirements, legacy alias behavior, or collab-tip UX

## Success Criteria

- the launch/start handoff for `rlm` moves out of `bin/codex-orchestrator.ts`
- the binary wrapper keeps only truthful top-level command ownership
- focused parity covers launch behavior while preserving the `1278` completion helper contract
