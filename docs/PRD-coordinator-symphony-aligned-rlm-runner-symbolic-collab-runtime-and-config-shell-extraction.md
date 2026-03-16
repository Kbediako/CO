# PRD: Coordinator Symphony-Aligned RLM Runner Symbolic Collab Runtime And Config Shell Extraction

## Summary

After `1237` extracted the runtime and collab lifecycle shell, the next truthful follow-on is the remaining symbolic collab-runtime invocation and config seam that still sits partly in `rlmRunner.ts`.

## Problem

The RLM runner family is now substantially cleaner, but one bounded shell contract still spans a compact set of files:

- `orchestrator/src/cli/rlmRunner.ts`
- `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
- `orchestrator/tests/RlmCodexRuntimeShell.test.ts`
- `orchestrator/tests/RlmRunnerCollabLifecycle.test.ts`
- `orchestrator/tests/RlmRunnerMode.test.ts`

`rlmRunner.ts` still duplicates the same collab-aware symbolic invocation behavior in the symbolic `runSubcall` and deliberation branches, and it still owns canonical-vs-legacy env wrapper resolution for collab role policy and default-role allowance even though those rules are already conceptually part of the extracted runtime shell. The same shell-owned helper surface is also still being exercised through `rlmRunner.__test__` in focused tests instead of direct shell imports.

## Goal

Extract the remaining symbolic collab-runtime invocation and config surface into `rlmCodexRuntimeShell.ts`, then rehome focused shell tests so `rlmRunner.ts` keeps only top-level orchestration ownership.

## Non-Goals

- reopening the broader runtime command resolution and JSONL lifecycle work already completed in `1237`
- widening into algorithmic changes inside the iterative or symbolic cores
- extracting the larger CLI and env parsing block from `rlmRunner.ts` just to shrink the file
- changing symbolic budgets, alignment policy, or other top-level orchestration behavior beyond the bounded shell move

## Success Criteria

- docs-first artifacts capture the remaining symbolic collab-runtime shell boundary after `1237`
- `rlmCodexRuntimeShell.ts` owns the duplicated collab-aware symbolic invocation path and the associated role-policy and allow-default-role config wrappers
- focused RLM tests cover the extracted shell directly instead of relying on `rlmRunner.__test__` for shell-owned behavior
- symbolic handoff, lifecycle validation, and role-policy behavior stay stable
