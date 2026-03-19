---
id: 20260307-1032-coordinator-symphony-aligned-collection-backed-compatibility-projection
title: Coordinator Symphony-Aligned Collection-Backed Compatibility Projection
relates_to: docs/PRD-coordinator-symphony-aligned-collection-backed-compatibility-projection.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: replace the direct selected-run coupling in the Symphony-aligned compatibility state/issue readers with an explicit collection-backed compatibility projection derived from the current runtime snapshot.
- Scope: compatibility projection types/builders, runtime exposure, state/issue route adoption, plus regression/manual evidence updates.
- Constraints: preserve the selected-run seam for non-core consumers, keep `/api/v1/dispatch` separate, avoid speculative multi-run aggregation, and avoid broad module splits.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1031`.
- Reasoning: the delegated real-Symphony scout found that the higher-value remaining gap is the compatibility read-model shape, not the last couple of route-local helpers. The smallest next move is to introduce a collection-backed compatibility projection over the existing runtime snapshot so the core compatibility API stops reading `snapshot.selected` directly.
- Initial review evidence: `docs/findings/1032-collection-backed-compatibility-projection-deliberation.md`, `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/router.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegation note: register a task-scoped scout/docs-review lane before implementation so the slice boundary can still be corrected if delegated evidence finds a sharper transition path.
- Docs-review override evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/20260306T232904Z-preimpl-review-and-docs-review-override/00-summary.md`, `.runs/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/cli/2026-03-06T23-27-09-868Z-9572b1b3/manifest.json`.
