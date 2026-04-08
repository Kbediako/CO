# PRD - Coordinator Symphony-Aligned Compatibility Issue Presenter Extraction

## Problem

`1035` made the compatibility surface issue-centered and deterministic, but the resulting aggregation, alias resolution, representative selection, issue payload assembly, and canonical lookup policy still live inline inside `observabilityReadModel.ts`. The behavior is better, but the presenter boundary is still blurrier than it should be for continued Symphony-style alignment.

## Goal

Extract a dedicated compatibility issue presenter helper so the compatibility route surface keeps its current behavior while the issue aggregation and payload policy become easier to reason about, test, and extend.

## User Value

- Future Symphony-aligned compatibility slices can land in smaller, clearer increments.
- Operators keep the exact same compatibility behavior from `1035` while the implementation becomes less fragile.
- CO preserves the harder current-run authority model without hiding policy inside one oversized read-model file.

## Scope

- Extract compatibility issue aggregation, representative selection, issue payload assembly, and canonical/alias lookup into a dedicated helper/module.
- Keep compatibility route payloads and canonical-vs-alias behavior stable.
- Keep `/ui/data.json`, Telegram oversight, and dispatch evaluation on the selected-run seam.

## Non-Goals

- No live provider ingestion changes.
- No scheduler ownership changes.
- No Telegram/Linear control-surface expansion.
- No compatibility contract changes unless a test-backed correction is required.

## Constraints

- Preserve the `1035` behavior exactly unless a regression test proves a fix is needed.
- Keep `/api/v1/dispatch` as a CO-only extension seam.
- Keep the extraction bounded to compatibility presenter/indexing code and its tests.
