# Findings: 1264 PR CLI Shell Extraction

- After `1263`, the remaining local review pocket is explicitly frozen.
- The next stronger nearby real shell boundary is `handlePr(...)` in `bin/codex-orchestrator.ts`.
- That wrapper still owns top-level help gating, subcommand validation, subcommand-to-mode selection, and exit-code mapping above the existing `scripts/lib/pr-watch-merge.js` runner.
- Result: register a bounded `pr` CLI shell extraction lane.
