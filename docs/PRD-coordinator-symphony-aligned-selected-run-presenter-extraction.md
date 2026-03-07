# PRD - Coordinator Symphony-Aligned Selected-Run Presenter Extraction

## Problem

`1036` extracted the compatibility-only presenter, but the selected-run presentation path is still split between `observabilityReadModel.ts`, `observabilitySurface.ts`, and Telegram-facing helpers. The behavior is stable, but the selected-run presenter/controller boundary is still blurrier than it should be for continued Symphony-style alignment.

## Goal

Extract a dedicated selected-run presenter helper so selected-run payload shaping and UI dataset assembly inputs sit behind one stable presenter boundary while route and runtime semantics stay unchanged.

## User Value

- Future Symphony-aligned selected-run/UI slices can land in smaller, clearer increments.
- Operators keep the exact same `/ui/data.json` and selected-run behavior while the implementation becomes less fragile.
- CO preserves the harder current-run authority model without hiding selected-run presentation policy across multiple files.

## Scope

- Extract selected-run payload assembly helpers into a dedicated presenter module.
- Move UI dataset assembly inputs behind that presenter boundary while keeping `observabilitySurface.ts` focused on I/O and HTTP emission.
- Keep `/ui/data.json`, Telegram oversight, compatibility routes, and dispatch evaluation behavior stable.

## Non-Goals

- No live provider ingestion changes.
- No scheduler ownership changes.
- No Telegram/Linear control-surface expansion.
- No compatibility contract changes unless a test-backed correction is required.
- No Telegram message-format or fingerprint contract changes.

## Constraints

- Preserve the current selected-run behavior exactly unless a regression test proves a fix is needed.
- Keep `/api/v1/dispatch` as a CO-only extension seam.
- Keep the extraction bounded to selected-run presenter code and its tests.
