# ACTION_PLAN: Coordinator Symphony-Aligned Exec CLI Shell Extraction

## Steps

1. Reinspect `handleExec(...)`, `parseExecArgs(...)`, and the handoff into `executeExecCommand(...)` to confirm the exact shell boundary.
2. Extract the bounded binary-facing `exec` launch shell behind a dedicated helper without widening into unrelated binary helpers.
3. Add focused parity coverage for the extracted shell and any touched CLI surface.
4. Validate the shipped tree honestly, including review and pack-smoke, then record the next truthful nearby seam or freeze.
