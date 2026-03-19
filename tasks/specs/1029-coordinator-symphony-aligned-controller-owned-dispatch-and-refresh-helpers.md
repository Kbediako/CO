---
id: 20260306-1029-coordinator-symphony-aligned-controller-owned-dispatch-and-refresh-helpers
title: Coordinator Symphony-Aligned Controller-Owned Dispatch + Refresh Helpers
relates_to: docs/PRD-coordinator-symphony-aligned-controller-owned-dispatch-and-refresh-helpers.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary

- Objective: move compatibility dispatch and refresh semantics out of `ControlRuntime` and into controller-owned helpers while preserving transport-neutral runtime facts.
- Scope: `/api/v1/dispatch`, `/api/v1/refresh`, and Telegram oversight dispatch parity.
- Constraints: no payload-shape changes, no auth/authority changes, and no live Linear policy changes.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1028`.
- Reasoning: `1028` completed the selected-run presenter extraction for `/ui`, `/state`, and `/issue`; the remaining ownership mismatch is dispatch/refresh route behavior plus Telegram dispatch parity.
- Initial review evidence: `docs/findings/1029-controller-owned-dispatch-and-refresh-helpers-deliberation.md`, `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/20260306T195956Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
