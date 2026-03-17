# ACTION_PLAN: Coordinator Symphony-Aligned Delegation Server CLI Shell Extraction

## Steps

1. Isolate the current `delegation-server` shell contract in `bin/codex-orchestrator.ts`.
2. Extract that shell into a dedicated module while preserving help gating, mode resolution, override parsing, and warn-only fallback semantics.
3. Add focused helper and/or CLI parity coverage for the extracted boundary.
4. Run the bounded validation lane, recording any pre-existing unrelated carry-forwards explicitly.
