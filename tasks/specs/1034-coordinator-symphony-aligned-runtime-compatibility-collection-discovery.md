---
id: 20260307-1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery
title: Coordinator Symphony-Aligned Runtime Compatibility Collection Discovery
relates_to: docs/PRD-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md
risk: high
owners:
  - Codex
last_review: 2026-03-07
---

## Summary

- Objective: populate the core compatibility projection from a bounded discovered set of runtime `running` and `retrying` entries rather than from a selected-manifest-only source.
- Scope: runtime discovery boundaries, compatibility collection population, and regression/manual evidence updates.
- Constraints: preserve the selected-run seam for UI/Telegram, keep `/api/v1/dispatch` separate, avoid scheduler/authority expansion, and avoid broad control-server rewrites.

## Pre-Implementation Review Note

- Decision: approved for docs-first planning as the immediate next slice after `1033`.
- Reasoning: `1033` completed the dedicated compatibility source boundary, so the next higher-value remaining gap is that the compatibility source still only represents one selected manifest. The smallest next move is to introduce bounded runtime discovery for compatibility `running` and `retrying` collections while leaving the selected-run seam intact for UI/Telegram.
- Initial review evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/20260307T010851Z-closeout/14-next-slice-note.md`, `docs/findings/1034-runtime-compatibility-collection-discovery-deliberation.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir/orchestrator.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegation note: register a task-scoped scout/docs-review lane before implementation so the slice boundary can still be corrected if delegated evidence finds a smaller discovery seam.
- Docs-review override evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T023357Z-preimpl-review-and-docs-review-override/00-summary.md`, `.runs/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/cli/2026-03-07T02-27-59-777Z-f19359d3/manifest.json`.

## Post-Implementation Outcome

- Result: completed. Compatibility `state` / `issue` now fan out over bounded sibling runtime `running` and `retrying` discovery while `/ui/data.json`, Telegram oversight, and the selected-run seam remain current-run-only.
- Closeout evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/00-summary.md`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/11-manual-compatibility-collection-discovery.json`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/13-elegance-review.md`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/14-override-notes.md`.
