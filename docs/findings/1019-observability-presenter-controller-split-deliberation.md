# Findings - 1019 Observability Presenter/Controller Split Deliberation

## Decision
- Proceed with a narrow follow-up slice after `1018` to complete the Symphony-style presenter/controller split for the read-only observability routes.

## Why This Slice
- Real Symphony keeps its observability controller thin and lets the presenter own payload shaping.
- `1018` extracted the observability surface but still left method/status/header/error decisions inside that module.
- The remaining work is now small and architectural: reduce the surface to payload-oriented logic so future UI/Telegram/downstream status readers depend on a clearer presenter seam.

## Delegated Review Synthesis
- A read-only `gpt-5.4` review stream confirmed the main coupling hotspots:
  - `observabilitySurface.ts` still takes request methods and returns HTTP-shaped `status` / `headers` / `body` triples.
  - compatibility error and issue-not-found envelope builders still live in the surface layer.
  - `/api/v1/refresh` rejection classification is still controller-shaped inside the surface module.
  - `/api/v1/dispatch` remains inline in `controlServer.ts`, so this slice should stay bounded to state/issue/refresh/UI and not widen into dispatch redesign.
- The same review explicitly kept auth/session/CSRF/SSE/webhook flows, Telegram rendering, and CO authority semantics out of scope.
- The recommended focused validation set is:
  - `orchestrator/tests/ControlServer.test.ts`,
  - `orchestrator/tests/TelegramOversightBridge.test.ts`,
  - then the normal repo-wide validation chain at closeout.

## Real Symphony References
- `symphony/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex` keeps HTTP routing thin and presenter-driven.
- `symphony/elixir/lib/symphony_elixir_web/presenter.ex` centralizes shared state, issue, and refresh payload shaping.
- `symphony/elixir/lib/symphony_elixir_web/live/dashboard_live.ex` reads the same presenter payloads as the API surface.
- `symphony/elixir/lib/symphony_elixir_web/router.ex` keeps route and method ownership outside the presenter.
- `symphony/SPEC.md` describes the HTTP surface as observability-oriented rather than correctness-bearing, which matches the target CO boundary.

## Explicit Non-Goals
- No `/api/v1/dispatch` redesign.
- No control mutation or webhook changes.
- No Telegram rendering changes.
- No Linear authority or advisory-ingress changes.
- No opportunistic broad helper deduplication beyond what the split directly requires.
