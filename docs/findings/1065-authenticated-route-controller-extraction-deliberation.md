# 1065 Deliberation - Authenticated Route Controller Extraction

## Why this slice now

`1064` removed authenticated controller-context assembly from `controlServer.ts`, but the file still owns the full post-gate authenticated handoff block. That is now the next smallest remaining Symphony-aligned concentration in the outer server controller.

## Recommended boundary

Extract only the post-gate authenticated handoff into a dedicated authenticated-route controller module. Keep these responsibilities in `controlServer.ts`:

- public-route ordering
- `admitAuthenticatedControlRoute(...)`
- final protected `not_found` fallback write

Do not reopen public-route behavior, auth policy, controller-context assembly, or controller-local behavior.

## CO-local evidence

- `orchestrator/src/cli/control/controlServer.ts` still performs the post-admission authenticated handoff inline even after `1064` moved context composition out.
- `out/1064-coordinator-symphony-aligned-authenticated-route-controller-context-extraction/manual/20260308T100622Z-closeout/14-next-slice-note.md` identifies the authenticated-route shell/handoff as the next bounded seam.
- Delegated read-only seam analysis independently converged on the same boundary and explicitly ruled out widening into public-route extraction, fallback/policy movement, or a generic router abstraction.

## Symphony reference

- `symphony/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex` keeps controller entrypoints thin and delegates payload shaping to shared helpers.
- `symphony/elixir/lib/symphony_elixir_web/presenter.ex` reinforces the current CO approach: explicit composition helpers outside the outer controller shell instead of a generic dependency container.
- `symphony/elixir/lib/symphony_elixir_web/router.ex` shows the same layering principle: routing stays explicit while controller seams remain thin.

## Risks to guard

- Over-extracting into a generic controller/middleware abstraction.
- Pulling public routes like `/auth/session` or `/integrations/linear/webhook` into the authenticated seam.
- Moving shared audit helpers that still serve Telegram oversight or other non-authenticated flows.
