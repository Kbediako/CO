# PRD - Coordinator Symphony-Aligned Collection-Backed Compatibility Projection

## Summary

After `1031`, CO’s core compatibility routes have the right route contract and cleaner response-builder boundaries, but the underlying read model is still a selected-run shim. This slice introduces a collection-backed compatibility projection for the Symphony-aligned core routes so `/api/v1/state` and `/api/v1/:issue_identifier` stop reading `snapshot.selected` directly and instead consume an explicit projection layer derived from the current runtime snapshot.

## Problem

- `readCompatibilityState(...)` and `readCompatibilityIssue(...)` in `observabilitySurface.ts` still read `snapshot.selected` directly and synthesize `running`/`retrying` collections ad hoc.
- The current state payload always emits `retrying: []`, and issue lookup is selected-run-coupled instead of projection-coupled.
- Real Symphony’s controller/presenter shape centers on explicit `running` and `retrying` collections and searches issue detail from those collections.
- CO still needs the selected-run projection for UI, Telegram, and transition safety, but the compatibility API should stop being hard-wired to that internal seam.

## Goals

- Introduce a collection-backed compatibility projection layer for the Symphony-aligned core routes.
- Have `/api/v1/state` and `/api/v1/:issue_identifier` consume that projection instead of reading `snapshot.selected` directly.
- Preserve the current selected-run snapshot seam for UI, Telegram, and other non-core consumers.
- Keep `/api/v1/dispatch` as a separate CO-only extension.

## Non-Goals

- No true multi-run repo-wide aggregation in this slice.
- No Telegram or Linear workflow redesign.
- No dispatch policy or authority changes.
- No broad control-server or scheduler rewrite.

## Success Criteria

- The compatibility state/issue code path reads from an explicit collection-backed projection builder instead of directly inspecting the selected-run snapshot.
- The selected-run seam remains available for non-core consumers, but the core compatibility API no longer depends on it directly.
- Tests and manual evidence prove the compatibility route contract is preserved while the internal read-model shape moves closer to Symphony.
