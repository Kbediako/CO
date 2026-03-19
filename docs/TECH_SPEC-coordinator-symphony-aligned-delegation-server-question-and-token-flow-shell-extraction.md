# TECH_SPEC: Coordinator Symphony-Aligned Delegation Server Question and Token Flow Shell Extraction

## Context

[`orchestrator/src/cli/delegationServer.ts`](/Users/kbediako/Code/CO/orchestrator/src/cli/delegationServer.ts) still contains a cohesive question/delegation-token runtime cluster after `1230` closed the transport/runtime and tool-dispatch entry seam.

## Requirements

1. Extract the question enqueue/poll and delegation-token flow into a dedicated helper surface.
2. Preserve:
   - question enqueue payload semantics
   - question polling wait/clamp behavior
   - delegation-token resolution and token-file fallback behavior
   - `isRunAwaitingQuestion(...)` parity
   - expiry fallback behavior (`pause`, `resume`, `fail`)
3. Keep delegate spawn/status/cancel, GitHub tool handling, dynamic-tool bridge behavior, and `1230` transport/tool-dispatch ownership out of scope.
4. Keep the lane bounded to `delegationServer.ts` plus focused adjacent tests unless a tiny parity helper is strictly required.

## Proposed Boundary

- Host file keeps the underlying control/runtime callbacks and unrelated handler families.
- Extracted helper owns:
  - question enqueue/poll entry flow
  - delegation token resolution + token-file reads
  - await-state and expiry-fallback helpers
  - question-poll wait clamping

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: the question/token flow cluster can move together without widening into unrelated handler families
- `no-go`: local inspection shows the candidate is synthetic or already frozen by the post-`1230` boundary
