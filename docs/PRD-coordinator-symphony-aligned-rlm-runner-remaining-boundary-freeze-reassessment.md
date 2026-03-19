# PRD: Coordinator Symphony-Aligned RLM Runner Remaining Boundary Freeze Reassessment

## Summary

After `1238` extracted the remaining symbolic collab-runtime invocation and shell-owned config surface, the next truthful broader subsystem is a reassessment of whether any real RLM runner boundary remains.

## Problem

The RLM runner family is now split across stable ownership:

- `orchestrator/src/cli/rlmRunner.ts`
- `orchestrator/src/cli/rlm/runner.ts`
- `orchestrator/src/cli/rlm/symbolic.ts`
- `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`

At this point `rlmRunner.ts` appears to own runner-level CLI and env parsing, mode selection, collab enablement choice, planner orchestration, budgets, alignment policy, state writing, and handoff into already-extracted helpers and loop cores. Forcing another split here could create a fake abstraction that only hides top-level orchestration.

## Goal

Reassess the broader post-`1238` RLM runner boundary and record whether an exact bounded implementation seam still exists, or whether the correct result is an explicit no-op freeze.

## Non-Goals

- reopening the `1238` runtime and config extraction
- widening into iterative or symbolic loop-core algorithm changes
- changing live RLM behavior in a docs-first reassessment lane
- treating test naming drift or file size alone as proof that another extraction must exist

## Success Criteria

- docs-first artifacts capture the broader post-`1238` RLM runner reassessment boundary
- the lane identifies either:
  - an exact next truthful implementation seam, or
  - an explicit no-op freeze with concrete reasons
- the reassessment keeps mode-selection, alignment policy, planner ownership, and helper handoff risks explicit
