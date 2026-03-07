# PRD - Coordinator Symphony-Aligned Runtime Compatibility Collection Discovery

## Summary

After `1033`, CO's core compatibility routes own their projection and source seam, but the source still only represents the selected manifest plus an optional single running entry. This slice introduces a bounded runtime discovery layer so the Symphony-aligned core compatibility API can populate `running` and `retrying` collections from discovered runtime state instead of treating the selected run as the whole world.

## Problem

- `readCompatibilityProjection()` now owns its own runtime source, but that source still derives from one selected manifest snapshot.
- `running` can contain at most one entry and `retrying` is always empty, even when sibling runs under `.runs/` expose more relevant compatibility state.
- Real Symphony's snapshot contract is collection-backed from orchestrator state, and the presenter resolves `/api/v1/state` and `/api/v1/:issue_identifier` from those collections rather than a selected-run special case.
- CO still needs the selected-run seam for UI and Telegram, but the core compatibility API should grow toward a bounded collection discovery model that is independent of that seam.

## Goals

- Introduce a bounded runtime discovery layer for compatibility `running` and `retrying` collections.
- Keep the core compatibility API collection-backed while moving beyond a single selected manifest source.
- Preserve the selected-run seam for UI, Telegram, and other selected-run consumers.
- Keep `/api/v1/dispatch`, Telegram control authority, and Linear advisory policy unchanged.

## Non-Goals

- No broad scheduler, ownership, or multi-run control refactor.
- No authority transfer from CO to Telegram, Linear, or any provider surface.
- No redesign of Telegram or Linear provider wiring.
- No repo-wide historical archive aggregation.

## Success Criteria

- The compatibility runtime snapshot can discover bounded `running` and `retrying` entries beyond the selected manifest.
- `/api/v1/state` counts and issue lookup reflect discovered compatibility collections rather than a selected-run-only source.
- UI/Telegram selected-run consumers remain on their current seam with no control-policy changes.
- Regression and manual evidence prove the compatibility surface becomes more Symphony-aligned without broadening control authority.
