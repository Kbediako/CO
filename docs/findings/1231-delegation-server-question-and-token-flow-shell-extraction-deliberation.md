# Findings - 1231 Delegation Server Question and Token Flow Shell Extraction Deliberation

## Decision

Proceed with a bounded Symphony-aligned extraction centered on the remaining question/delegation-token flow cluster inside `orchestrator/src/cli/delegationServer.ts`.

## Why this seam next

- `1230` already removed the RPC transport/runtime and top-level tool-dispatch shell, so the next truthful move must stay off those freshly closed helpers.
- Bounded scout evidence and local inspection both point to a coherent remaining cluster: question enqueue/poll flow, delegation-token resolution, await-state detection, and expiry fallback.
- This seam is narrower and more honest than forcing a wider handler-family extraction across spawn/status/cancel/GitHub/control flows.

## Boundaries to keep

- Do not widen into `delegationServerTransport.ts` or `delegationServerToolDispatchShell.ts`.
- Do not change delegate spawn, status, pause, cancel, dynamic-tool bridge, or GitHub semantics in this lane.
- Do not widen into Telegram, Linear, doctor, diagnostics, or RLM surfaces.

## Approval

- 2026-03-16: Approved for docs-first registration after the `1230` closeout and bounded scout evidence identified the question/delegation-token cluster as the next truthful remaining seam in `delegationServer.ts`.
