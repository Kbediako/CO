# ACTION_PLAN: Coordinator Symphony-Aligned Delegation Setup CLI Shell Extraction

## Steps

1. Extract the `delegation setup` CLI shell from `bin/codex-orchestrator.ts` into a dedicated helper.
2. Keep shared parser/help primitives and the underlying `runDelegationSetup(...)` engine untouched.
3. Add focused helper and CLI-surface parity coverage only where needed.
4. Validate the lane honestly, record any carry-forward overrides, then reassess the remaining local `delegation` pocket.
