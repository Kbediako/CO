# ACTION_PLAN: Coordinator Symphony-Aligned Delegation Server RPC Transport and Tool-Dispatch Shell Extraction

## Steps

1. Register `1230` docs-first artifacts, task mirrors, and registry entries.
2. Run the deterministic docs-first guard bundle (`spec-guard`, `docs:check`, `docs:freshness`).
3. Reinspect `delegationServer.ts` around `startDelegationServer(...)`, `runJsonRpcServer(...)`, and `handleToolCall(...)` to confirm the exact extraction seam.
4. Extract the transport/runtime and tool-dispatch entry shell without widening into individual handler rewrites.
5. Close with focused regression evidence and an explicit minimality review.

## Guardrails

- Do not widen into Telegram or Linear provider setup/testing.
- Do not reopen the frozen standalone-review wrapper subsystem.
- Do not merge unrelated helper families merely because they are nearby in `delegationServer.ts`.
- Prefer one bounded extraction lane now; defer follow-on seams if the host file still retains truthful policy/handler ownership afterward.
