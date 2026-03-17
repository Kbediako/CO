# PRD: Coordinator Symphony-Aligned Delegation Server CLI Shell Extraction

## Summary

After `1258` froze the remaining local `skills` pocket, the next truthful nearby shell candidate is the inline `delegation-server` family in `bin/codex-orchestrator.ts`.

## Problem

`handleDelegationServer(...)` in `bin/codex-orchestrator.ts` still owns a bounded shell above the existing delegation-server engine:

- help gating for the `delegation-server` family
- CLI/env mode resolution with warn-only invalid-mode fallback
- config-override flag parsing and normalization
- repo-root resolution and handoff into the delegation-server engine

That is a real mixed shell boundary even though the underlying server implementation already lives in `orchestrator/src/cli/delegationServer.ts`.

## Goal

Extract the inline `delegation-server` shell into a dedicated boundary without changing user-facing behavior.

## Non-Goals

- widening back into the delegation-server internals already extracted in earlier lanes
- changing the underlying `startDelegationServer(...)` engine semantics
- refactoring shared top-level parser/help helpers outside the bounded shell move

## Success Criteria

- `delegation-server` moves behind a dedicated shell boundary
- help gating, mode resolution, override parsing, and warn-only fallback behavior remain stable
- focused parity coverage is added if the extracted shell needs direct tests
