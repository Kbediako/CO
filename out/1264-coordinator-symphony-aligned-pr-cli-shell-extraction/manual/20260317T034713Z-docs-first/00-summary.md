# 1264 Docs-First Summary

`1264` is registered as a bounded extraction lane. After `1263` closed the remaining review launch shell and froze the local review pocket, the next truthful nearby shell candidate is `handlePr(...)` in `bin/codex-orchestrator.ts`. That wrapper still owns top-level `pr` help gating, subcommand validation, subcommand-to-mode selection, and exit-code mapping above the existing `scripts/lib/pr-watch-merge.js` runner, so the next move is a dedicated PR CLI shell extraction rather than a freeze or a deeper runner refactor.
