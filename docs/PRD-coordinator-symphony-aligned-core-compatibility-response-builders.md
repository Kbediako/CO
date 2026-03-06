# PRD - Coordinator Symphony-Aligned Core Compatibility Response Builders

## Summary

After `1030`, CO cleanly distinguishes the Symphony-aligned core compatibility routes from the CO-only `/api/v1/dispatch` extension, but `controlServer.ts` still assembles the core compatibility error and rejection responses inline. This slice tightens the controller -> presenter boundary further by moving the remaining core compatibility response shaping into shared builders while preserving the current route contract and dispatch-extension split.

## Problem

- `controlServer.ts` still owns method-not-allowed, issue-not-found, route-not-found, and refresh-rejection payload shaping for the core compatibility surface.
- Real Symphony’s controller stays thinner: route handlers delegate state/issue/refresh payload shaping to `Presenter`, and even the shared error path is a controller-local helper rather than route-local assembly.
- CO already has `observabilitySurface.ts` as the compatibility shaping seam, so leaving the remaining core response-building in the route switch keeps the controller more coupled than necessary.

## Goals

- Move the remaining Symphony-aligned core compatibility response shaping behind shared builders instead of inline controller assembly.
- Keep `controlServer.ts` focused on route selection, method gating, auth, and final response emission.
- Preserve the explicit CO-only `/api/v1/dispatch` extension boundary introduced in `1030`.
- Preserve all existing payloads, traceability fields, fail-closed behavior, and authority boundaries.

## Non-Goals

- No dispatch policy changes or runtime authority changes.
- No Telegram or Linear feature redesign.
- No large router rewrite or broad module split.
- No attempt to make CO identical to Symphony where CO-specific control surfaces are deliberate.

## Success Criteria

- Core compatibility method-not-allowed, issue-not-found, route-not-found, and refresh-rejection responses come from shared builders rather than inline route-local assembly.
- `controlServer.ts` becomes narrower for the Symphony-aligned core routes without reopening `/api/v1/dispatch`.
- Tests and manual evidence show the core route behavior is unchanged while the controller/presenter boundary becomes clearer.
