# Findings: 1255 Codex Setup And Defaults CLI Shell Extraction

- `handleCodex(...)` still owns a bounded top-level shell above `orchestrator/src/cli/codexCliSetup.ts` and `orchestrator/src/cli/codexDefaultsSetup.ts`.
- The remaining shell family still performs shared help/subcommand gating, per-subcommand flag mapping, and JSON/text output shaping, so there is a truthful nearby extraction after `1254`.
- The underlying setup/defaults engines remain out of scope for this lane.
