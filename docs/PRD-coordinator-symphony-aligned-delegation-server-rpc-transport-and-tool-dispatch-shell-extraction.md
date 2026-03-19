# PRD: Coordinator Symphony-Aligned Delegation Server RPC Transport and Tool-Dispatch Shell Extraction

## Summary

After `1228` froze the standalone-review wrapper subsystem, the next truthful Symphony-aligned seam is the mixed-ownership runtime entry surface in [`orchestrator/src/cli/delegationServer.ts`](/Users/kbediako/Code/CO/orchestrator/src/cli/delegationServer.ts).

## Problem

`delegationServer.ts` still concentrates three distinct responsibilities near the top of the file:

- delegation-server startup orchestration in `startDelegationServer(...)`
- JSON-RPC transport framing and request/response plumbing in `runJsonRpcServer(...)`
- tool-call entry validation and dispatch routing in `handleToolCall(...)`

That keeps one file responsible for both low-level RPC transport/runtime concerns and the higher-level delegation/control policy surface that already has substantial downstream helpers and tests.

## Goal

Extract the delegation-server RPC transport and tool-dispatch shell into a bounded helper surface while preserving the existing tool handlers, control-endpoint behavior, dynamic-tool bridge policy, GitHub tool behavior, and JSON-RPC response shapes.

## Non-Goals

- changing delegate-mode policy, tool authorization, or security semantics
- changing individual tool handlers such as `handleDelegateSpawn(...)`, question handling, dynamic-tool bridge calls, or GitHub calls
- changing transport protocol compatibility, response framing rules, or schema shapes
- widening into Telegram, Linear, control-server, or RLM surfaces

## Success Criteria

- the RPC transport/runtime entry shell is extracted behind a dedicated helper or helper pair
- tool-dispatch entry validation/routing is extracted from the host file without changing handler behavior
- `delegationServer.ts` retains policy/handler ownership rather than becoming a synthetic pass-through
- focused regressions prove JSON-RPC framing, initialize/list/call routing, delegate-mode enforcement, and tool-dispatch behavior remain unchanged
