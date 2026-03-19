# Findings: 1268 Init CLI Shell Extraction

- Post-`1267`, the remaining local devtools pocket is wrapper-only glue and correctly freezes.
- `handleInit(...)` still mixes top-level `init codex` validation, summary rendering, and optional managed-Codex setup orchestration above two existing helpers: `orchestrator/src/cli/init.ts` and `orchestrator/src/cli/codexCliSetup.ts`.
- That makes `init` the next truthful nearby binary-facing shell candidate rather than another devtools follow-on or a broader parser/help cleanup.
- Result: register an `init` CLI shell extraction lane, not another local freeze in the devtools pocket.
