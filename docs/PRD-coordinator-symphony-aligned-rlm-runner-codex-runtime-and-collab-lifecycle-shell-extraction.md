# PRD: Coordinator Symphony-Aligned RLM Runner Codex Runtime and Collab Lifecycle Shell Extraction

## Summary

After the control bootstrap and Telegram oversight pocket froze in `1236`, the next truthful broader subsystem is the RLM runner boundary where Codex runtime command selection, Codex exec and JSONL launching, collab lifecycle validation, and the handoff into the iterative and symbolic cores still meet in `rlmRunner.ts`.

## Problem

The RLM subsystem already has two separated cores:

- `orchestrator/src/cli/rlm/runner.ts`
- `orchestrator/src/cli/rlm/symbolic.ts`

But the top-level runner still owns a dense mixed boundary in:

- `orchestrator/src/cli/rlmRunner.ts`

That file currently combines runtime Codex command context resolution, `codex exec` invocation, JSONL completion handling, collab lifecycle parsing and validation, feature-key negotiation, multi-agent env policy handling, and the final handoff into the already-separated iterative and symbolic loops. That is a real mixed ownership surface, not just wrapper adjacency.

## Goal

Extract the remaining Codex runtime and collab lifecycle shell from `rlmRunner.ts` so the RLM entry surface keeps CLI and orchestration ownership while the reusable Codex runtime and collab lifecycle boundary moves behind a bounded helper contract.

## Non-Goals

- rewriting the iterative loop in `orchestrator/src/cli/rlm/runner.ts`
- rewriting the symbolic loop in `orchestrator/src/cli/rlm/symbolic.ts`
- changing RLM mode selection policy or collab role-policy semantics
- widening into doctor, control, or standalone-review families

## Success Criteria

- docs-first artifacts capture the RLM runtime and collab lifecycle extraction boundary
- the lane extracts the mixed Codex runtime and collab lifecycle shell from `rlmRunner.ts` into a bounded helper
- the existing mode, feature-key, and collab lifecycle validation contracts remain covered by focused RLM tests
