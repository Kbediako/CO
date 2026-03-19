# PRD: Coordinator Symphony-Aligned Delegation Server Question and Token Flow Shell Extraction

## Summary

After `1230` extracted the delegation-server RPC transport/runtime and tool-dispatch entry shell, the next truthful mixed-ownership seam in [`orchestrator/src/cli/delegationServer.ts`](/Users/kbediako/Code/CO/orchestrator/src/cli/delegationServer.ts) is the question/delegation-token flow cluster.

## Problem

`delegationServer.ts` still mixes a coherent question-handling and delegation-token runtime cluster into the host file:

- `handleQuestionEnqueue(...)`
- `handleQuestionPoll(...)`
- `resolveDelegationToken(...)`
- `resolveDelegationTokenPath(...)`
- `readDelegationTokenFile(...)`
- `applyQuestionFallback(...)`
- `isRunAwaitingQuestion(...)`
- `clampQuestionPollWaitMs(...)`

Those functions jointly own how the delegation server resolves parent/child delegation tokens, polls queued questions, determines whether a run is awaiting an answer, and applies the configured fallback when questions expire. Keeping them inline alongside unrelated status/spawn/cancel/GitHub/control helpers leaves the host file with another remaining mixed-ownership seam after `1230`.

## Goal

Extract the delegation-server question and token flow shell into a bounded helper surface while preserving existing question semantics, token resolution behavior, fallback policy, and control-endpoint/runtime interactions.

## Non-Goals

- changing the newly extracted RPC transport/runtime or tool-dispatch shell from `1230`
- changing delegate spawn, pause, cancel, or status handler semantics
- changing dynamic-tool bridge or GitHub tool behavior
- widening into Telegram, Linear, doctor, diagnostics, or RLM families

## Success Criteria

- the question/delegation-token flow cluster is extracted behind a dedicated helper boundary
- `delegationServer.ts` retains host ownership for the concrete runtime/control operations rather than becoming a pass-through shell
- focused regressions cover question enqueue/poll behavior, token resolution, await-state detection, and fallback parity
- the lane stays bounded to the question/token seam and does not reopen the freshly closed `1230` boundary
