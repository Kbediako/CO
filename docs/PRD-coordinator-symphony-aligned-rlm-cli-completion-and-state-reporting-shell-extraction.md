# PRD: Coordinator Symphony-Aligned RLM CLI Completion and State Reporting Shell Extraction

## Summary

After `1277` closed as a `go` reassessment, the next truthful nearby seam is the RLM post-start completion and state-reporting shell still inline in `handleRlm(...)` inside `bin/codex-orchestrator.ts`.

## Problem

The local `rlm` wrapper still mixes:

- binary-facing help and shared `parseArgs(...)` ownership
- repo-policy, runtime-mode, goal/task/env shaping, and doctor-tip UX
- inline manifest completion polling, `rlm/state.json` readback, terminal status printing, and exit-code mapping

That final post-start run-tail is a bounded shell concern above the deeper RLM runtime and should move out of the binary wrapper.

## Goal

Extract the RLM completion/state-reporting shell without widening into the deeper `rlmRunner.ts` runtime or changing user-facing CLI behavior.

## Non-Goals

- reopening the deeper `rlmRunner.ts` runtime/state-writing ownership
- merging the whole `rlm` wrapper into `startCliShell.ts`
- changing `rlm` help text, goal requirements, or flag semantics

## Success Criteria

- the post-start manifest/state completion path moves out of `bin/codex-orchestrator.ts`
- the binary wrapper retains only truthful top-level CLI ownership
- focused parity covers terminal status propagation, missing-state fallback, and existing RLM command-surface behavior
