# ACTION_PLAN: Coordinator Symphony-Aligned Start CLI Shell Extraction

## Steps

1. Reinspect `handleStart(...)` and the handoff into `orchestrator.start(...)` to confirm the exact shell boundary.
2. Extract the bounded binary-facing `start` shell behind a dedicated helper without widening into neighboring command families.
3. Add focused parity coverage for the extracted shell and any touched CLI surface.
4. Validate the shipped tree honestly, including review and pack-smoke, then record the next truthful nearby seam or freeze.
