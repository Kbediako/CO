# ACTION_PLAN: Coordinator Symphony-Aligned Devtools CLI Shell Extraction

## Steps

1. Extract the binary-facing `devtools` shell from `bin/codex-orchestrator.ts` into a dedicated helper.
2. Keep shared parser/help primitives and the underlying `orchestrator/src/cli/devtoolsSetup.ts` engine untouched.
3. Add focused helper and CLI-surface parity coverage only where needed.
4. Validate the lane honestly, record any carry-forward overrides, then reassess the remaining local `devtools` pocket.
