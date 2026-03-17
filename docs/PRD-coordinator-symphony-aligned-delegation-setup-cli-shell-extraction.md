# PRD: Coordinator Symphony-Aligned Delegation Setup CLI Shell Extraction

## Summary

`handleDelegation(...)` in `bin/codex-orchestrator.ts` still owns a bounded `delegation setup` shell above the existing delegation setup engine.

## Problem

After `1260` froze the remaining local delegation-server pocket, the next nearby real shell boundary is the inline `delegation setup` wrapper. It still owns:

- top-level `delegation` subcommand validation
- `--format json` plus `--yes` compatibility enforcement
- repo-root resolution
- `runDelegationSetup(...)` invocation
- JSON/text summary rendering via `formatDelegationSetupSummary(...)`

That is a real mixed shell boundary even though the underlying setup engine already lives in `orchestrator/src/cli/delegationSetup.ts`.

## Goal

Extract the `delegation setup` CLI shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing the underlying `runDelegationSetup(...)` engine semantics
- widening into shared top-level parser/help primitives
- combining this lane with unrelated `mcp`, `delegate-server`, or broader binary cleanup

## Success Criteria

- the inline `delegation` shell is extracted behind a dedicated boundary
- help, subcommand validation, apply/format compatibility, repo-root defaults, and summary rendering remain behaviorally identical
- focused parity coverage exists where the extraction needs it
