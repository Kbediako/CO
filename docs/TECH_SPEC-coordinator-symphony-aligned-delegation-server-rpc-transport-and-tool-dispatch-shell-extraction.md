# TECH_SPEC: Coordinator Symphony-Aligned Delegation Server RPC Transport and Tool-Dispatch Shell Extraction

## Context

[`orchestrator/src/cli/delegationServer.ts`](/Users/kbediako/Code/CO/orchestrator/src/cli/delegationServer.ts) remains one of the largest mixed-ownership CLI runtime files in the repo. The first dense concentration at the file entry is:

- `startDelegationServer(...)`
- `runJsonRpcServer(...)`
- `handleToolCall(...)`

Those functions sit above a long tail of handler implementations and helper utilities. The current boundary keeps request transport/runtime, protocol framing, request-entry validation, and tool dispatch routing in the same module as the underlying delegation/control operations.

## Requirements

1. Extract the RPC transport/runtime shell behind a dedicated helper surface.
2. Extract the tool-dispatch entry shell, including tool-name validation and request-entry guard checks, behind a dedicated helper surface.
3. Keep the individual tool handlers and policy/helper implementations behaviorally unchanged in this lane.
4. Preserve:
   - initialize/list/call JSON-RPC behavior
   - framed + JSONL transport compatibility
   - delegate-mode enforcement
   - confirm/delegation token rejection behavior
   - existing error/response shapes
5. Keep the lane bounded to `delegationServer.ts` plus adjacent tests unless a tiny helper file is required for parity.

## Proposed Boundary

- Host file keeps handler ownership, tool schemas, and policy helpers.
- Extracted helper surface owns:
  - request-loop transport/runtime plumbing
  - top-level method routing (`initialize`, `tools/list`, `tools/call`)
  - tool-call entry validation and dispatch routing into host-provided callbacks/handlers

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a bounded helper extraction is implementable without widening into tool-handler rewrites
- `no-go`: local inspection shows the candidate is synthetic or collapses into no real ownership gain
