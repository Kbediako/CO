# 1064 Deliberation - Authenticated Route Controller Context Extraction

## Why this slice now

`1063` removed the authenticated route table from `controlServer.ts`, but the server still owns the large dispatcher callback assembly that wires every authenticated controller. That is now the next highest-value concentration in the file.

## Recommended boundary

Extract only the authenticated dispatcher callback assembly into a dedicated controller-context module. Keep these responsibilities in `controlServer.ts`:

- public-route ordering
- authenticated admission
- dispatcher invocation
- final protected `not_found` fallback

Do not reopen route matching, auth policy, or controller-local behavior.

## CO-local evidence

- `orchestrator/src/cli/control/controlServer.ts` now calls `handleAuthenticatedRouteDispatcher(...)`, but still builds the entire authenticated callback object inline.
- `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/14-next-slice-note.md` explicitly identifies authenticated callback assembly as the next bounded seam.
- Delegated read-only seam analysis independently converged on the same boundary: introduce a request-scoped authenticated composition helper and keep public prelude, authenticated admission, and protected fallback in `controlServer.ts`.

## Symphony reference

- `symphony/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex` keeps controller entrypoints thin and delegates payload shaping to shared helpers.
- `symphony/elixir/lib/symphony_elixir_web/presenter.ex` shows the pattern CO has already been following: shared composition helpers outside the outer controller shell, without collapsing into a generic router framework.
- `symphony/elixir/lib/symphony_elixir_web/router.ex` reinforces the same split: routing remains explicit while controller composition stays thin.

## Risks to guard

- Over-extracting into a generic DI container or registry.
- Hiding persistence/publish/audit ownership behind implicit globals.
- Changing protected fallback behavior while moving controller closures.
