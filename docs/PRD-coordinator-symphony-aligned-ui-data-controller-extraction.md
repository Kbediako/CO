# PRD - Coordinator Symphony-Aligned UI Data Controller Extraction

## Problem

`1037` extracted selected-run payload construction and `1038` extracted the `/api/v1/*` observability API controller, but `controlServer.ts` still owns the standalone `/ui/data.json` route inline. That leaves one remaining read-only controller seam mixed into the server entrypoint instead of behind a dedicated UI-route controller boundary.

## Goal

Extract a dedicated UI data controller helper so `/ui/data.json` method guards and response writing sit behind one stable controller boundary while selected-run payload construction, auth/session behavior, webhooks, and mutating control semantics stay unchanged.

## User Value

- Future Symphony-aligned controller refactors can proceed in smaller, safer increments.
- Operators keep the exact same `/ui/data.json` behavior while the server entrypoint becomes narrower and easier to reason about.
- CO preserves its stricter authority model by isolating the final read-only route seam from auth/session/webhook/control handling.

## Scope

- Extract the `/ui/data.json` route handling out of `controlServer.ts`.
- Move UI-route method guards and route-local response writing behind that controller boundary.
- Keep `selectedRunPresenter.ts` as the payload builder for the UI dataset.
- Keep the extracted UI controller read-only and transport-local.

## Non-Goals

- No payload-shape changes for `/ui/data.json`.
- No auth/session/token/webhook changes.
- No `/api/v1/*` route changes.
- No Telegram or Linear behavior changes.
- No mutating control-surface changes.
- No presenter/read-model reshaping unless a regression test proves a correction is required.

## Constraints

- Preserve HTTP status, headers, and body contracts for `/ui/data.json`.
- Keep `controlServer.ts` responsible for auth/session, webhooks, event stream, and mutating control endpoints.
- Keep `selectedRunPresenter.ts` responsible for UI dataset construction.
- Keep the extraction bounded to UI-route controller concerns and their tests.
