---
id: 20260306-1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary
title: Coordinator Symphony-Aligned Compatibility Route Contract + Dispatch Extension Boundary
relates_to: docs/PRD-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary

- Objective: tighten the remaining compatibility observability route contract against the real Symphony router/controller/presenter shape while keeping `/api/v1/dispatch` as an explicit CO-only extension.
- Scope: controller/presenter contract normalization for `state`, `refresh`, and `:issue_identifier`, plus explicit dispatch-extension boundary handling and regression coverage updates.
- Constraints: keep `ControlRuntime` transport-neutral, keep advisory-only behavior unchanged, preserve public payload compatibility, and avoid a broad refactor.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1029`.
- Reasoning: `1029` finished the controller-owned dispatch/refresh ownership move, but CO still blends a CO-only dispatch route into the same compatibility surface as the Symphony-aligned observability API. The smallest next move is to normalize the route/presenter contract and isolate the dispatch extension boundary rather than broadening the refactor.
- Initial review evidence: `docs/findings/1030-compatibility-route-contract-deliberation.md`, `out/1029-coordinator-symphony-aligned-controller-owned-dispatch-and-refresh-helpers/manual/20260306T203813Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/router.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegated review note: the read-only planning sidecar confirmed the key risks are dispatch-route boundary fall-through, refresh fail-closed parity, dispatch/status audit parity, Telegram parity, and selected-run cross-surface coherence; no large refactor is justified before this bounded parity pass lands.
- Docs-review override evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214215Z-preimpl-review-and-docs-review-override/00-summary.md`, `.runs/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/cli/2026-03-06T21-38-33-728Z-9c34c407/manifest.json`.
