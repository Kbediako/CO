---
id: 20260306-1031-coordinator-symphony-aligned-core-compatibility-response-builders
title: Coordinator Symphony-Aligned Core Compatibility Response Builders
relates_to: docs/PRD-coordinator-symphony-aligned-core-compatibility-response-builders.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary

- Objective: move the remaining Symphony-aligned core compatibility response shaping out of `controlServer.ts` route-local assembly into shared builders while keeping the `1030` dispatch-extension boundary intact.
- Scope: method-not-allowed, issue-not-found, route-not-found, and refresh-rejection response builders for the core compatibility surface, plus regression/manual evidence updates.
- Constraints: keep `ControlRuntime` transport-neutral, preserve payload and traceability parity, keep `/api/v1/dispatch` separate, and avoid broad module splits.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1030`.
- Reasoning: `1030` clarified the core-route versus extension boundary, but `controlServer.ts` still assembles the remaining core compatibility error/rejection envelopes inline. The smallest next move is to extract those builders into the existing `observabilitySurface.ts` seam instead of widening the refactor.
- Initial review evidence: `docs/findings/1031-core-compatibility-response-builders-deliberation.md`, `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/router.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegation note: a read-only real-Symphony comparison stream was launched before registration so the slice boundary can be corrected if upstream evidence shows a smaller or sharper split than the local pass identified.
- Docs-review override evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225303Z-preimpl-review-and-docs-review-override/00-summary.md`, `.runs/1031-coordinator-symphony-aligned-core-compatibility-response-builders/cli/2026-03-06T22-49-26-015Z-bf2771ea/manifest.json`.
