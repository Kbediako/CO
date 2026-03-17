# Findings: 1259 Delegation Server CLI Shell Extraction

- `handleDelegationServer(...)` still owns a bounded shell above `orchestrator/src/cli/delegationServer.ts`, so this is not just residual wrapper glue.
- The remaining shell contract is specific enough to extract cleanly: help gating, repo-root resolution, CLI/env mode selection, invalid-mode warning fallback, and config-override parsing.
- The truthful next move is a dedicated `delegation-server` shell extraction rather than widening into unrelated top-level CLI helpers.
