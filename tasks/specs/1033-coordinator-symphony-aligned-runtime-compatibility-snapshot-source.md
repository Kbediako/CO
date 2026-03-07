---
id: 20260307-1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source
title: Coordinator Symphony-Aligned Runtime Compatibility Snapshot Source
relates_to: docs/PRD-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: move the core compatibility projection off the selected-run runtime snapshot and onto a dedicated compatibility-oriented runtime snapshot source.
- Scope: runtime source/builder boundaries, compatibility projection adoption, and regression/manual evidence updates.
- Constraints: preserve the selected-run seam for UI/Telegram, keep `/api/v1/dispatch` separate, avoid speculative multi-run aggregation, and avoid broad control-server rewrites.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1032`.
- Reasoning: `1032` completed the projection-owned compatibility route boundary, so the next higher-value remaining gap is that the compatibility projection still depends on the selected-run runtime snapshot for its source data. The smallest next move is to give the compatibility API a dedicated runtime snapshot source while leaving UI/Telegram on the selected-run seam.
- Initial review evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/20260306T233750Z-closeout/14-next-slice-note.md`, `docs/findings/1033-runtime-compatibility-snapshot-source-deliberation.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir/orchestrator.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegation note: register a task-scoped scout/docs-review lane before implementation so the slice boundary can still be corrected if delegated evidence finds a smaller source split.
