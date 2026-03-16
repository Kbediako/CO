# 1238 Deliberation: RLM Runner Symbolic Collab Runtime And Config Shell Extraction

- Risk stays below the full-deliberation threshold because the lane remains local and bounded to a shell extraction with focused RLM coverage.
- The strongest reason to open this lane now is that `rlmRunner.ts` still duplicates the same collab-aware symbolic invocation behavior in two branches and still owns shell-level config wrappers that belong with the extracted runtime shell.
- The candidate seam is narrow: symbolic `runSubcall` and deliberation handoff plus role-policy and allow-default-role config ownership around `rlmCodexRuntimeShell.ts`.
- The key risk is symbolic multi-agent regression if lifecycle validation, feature enablement, or role-policy warnings drift during the move.
