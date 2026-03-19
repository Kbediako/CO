# TECH_SPEC - Coordinator Symphony-Aligned Compatibility Route Contract + Dispatch Extension Boundary

## Design

1. Use the real Symphony web layer as the reference shape:
   - router owns route wiring and method gating
   - controller owns request handling
   - presenter/runtime helpers return payloads without route-level ambiguity
2. Keep CO’s extra dispatch surface, but make it explicit as a CO-only extension instead of blending it into the core compatibility route family.
3. Preserve the transport-neutral runtime seam from `1028` and `1029`.

## Planned Changes

- `orchestrator/src/cli/control/controlServer.ts`
  - tighten the remaining compatibility route handling so state/refresh/issue follow a clearer Symphony-aligned controller pattern
  - isolate the dispatch route as an explicit CO extension branch with dedicated comments and/or helper boundaries
- `orchestrator/src/cli/control/observabilitySurface.ts`
  - separate Symphony-aligned compatibility payload helpers from CO-specific dispatch-extension behavior where that improves clarity without adding a new abstraction layer
  - keep fail-closed refresh validation and traceability intact
- Tests
  - preserve route/method/error coverage for state, refresh, issue, and dispatch
  - make the dispatch-extension contract explicit in test naming and assertions

## Real Symphony References

- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/router.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/presenter.ex`

## Validation

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
