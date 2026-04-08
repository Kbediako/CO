# PRD - Coordinator Symphony-Aligned Runtime Compatibility Snapshot Source

## Summary

After `1032`, CO’s core compatibility routes read from a collection-backed projection, but that projection still depends on the selected-run snapshot as its source. This slice introduces a dedicated runtime compatibility snapshot source so the Symphony-aligned core compatibility API owns its input seam instead of borrowing the UI/Telegram selected-run seam.

## Problem

- `readCompatibilityProjection()` currently derives its data from `readSelectedRunSnapshot()` rather than from a dedicated compatibility-oriented runtime snapshot source.
- That coupling keeps the compatibility projection architecturally downstream of the selected-run projection even though the compatibility routes now own their collection-based presentation layer.
- Real Symphony’s presenter/controller path consumes a runtime snapshot whose `running` and `retrying` collections are first-class inputs rather than selected-run side effects.
- CO still needs the selected-run seam for UI and Telegram, but the compatibility API should stop treating it as the authoritative source.

## Goals

- Introduce a dedicated runtime compatibility snapshot source for the core compatibility surface.
- Keep the compatibility projection builder collection-backed while removing its dependency on the selected-run runtime snapshot.
- Preserve the selected-run seam for UI, Telegram, and other non-core consumers.
- Keep `/api/v1/dispatch` and control authority semantics unchanged.

## Non-Goals

- No repo-wide multi-run aggregation in this slice.
- No new retry execution semantics or scheduler changes.
- No Telegram or Linear workflow redesign.
- No broad control-server rewrite.

## Success Criteria

- The compatibility projection is built from its own runtime snapshot source rather than `readSelectedRunSnapshot()`.
- The selected-run projection remains intact for UI/Telegram, but the core compatibility API no longer depends on it for source data.
- Regression and manual evidence prove the route contract remains stable while the internal source boundary moves closer to Symphony.
