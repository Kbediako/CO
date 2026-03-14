# PRD: Coordinator Symphony-Aligned Orchestrator Resume Token Validation Extraction

## Summary

After `1198` extracted the shared runtime-manifest mutation helper, the next truthful seam is the real resume-token validation contract that still lives in `orchestrator.ts` and is injected into the extracted resume-preparation shell.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns `validateResumeToken(...)`, a cohesive behavior cluster that performs filesystem I/O and enforces explicit resume-token error semantics.

That behavior is no longer public command-local shell logic. It is shared validation behavior passed into `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`.

This leaves the orchestrator entrypoint holding a reusable behavioral contract after the surrounding `resume()` preparation shell has already been extracted.

## Goal

Extract the real resume-token validation behavior into one bounded helper while preserving exact file-read, missing-token, and mismatch semantics and keeping broader resume preparation behavior intact.

## Non-Goals

- changing runtime selection or runtime-manifest mutation behavior
- changing the pre-start failure persistence callback
- changing `start()`, `resume()`, `status()`, or `plan()` behavior
- changing route-adapter, control-plane, or run-lifecycle orchestration
- changing resume-token error semantics beyond bounded refactor equivalence

## Success Criteria

- one bounded helper owns the real resume-token validation behavior
- `orchestrator.ts` no longer directly owns `validateResumeToken(...)`
- focused regressions preserve file-read, missing-token, and mismatch behavior
