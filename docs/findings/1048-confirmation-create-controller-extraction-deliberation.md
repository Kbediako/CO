# Findings - 1048 Confirmation Create Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1047` removed the standalone `/confirmations/validate` branch from `controlServer.ts`, leaving `/confirmations/create` as the remaining mostly self-contained confirmation lifecycle route still inline.
- That route owns one concept: expire old confirmations, normalize action/tool/params, enforce session-only `ui.cancel` restrictions, create or reuse the confirmation request, optionally auto-pause control state, emit `confirmation_required`, and return the creation payload.
- Extracting it now continues the Symphony-aligned controller thinning without widening into `/confirmations/approve` or the materially higher-authority `/control/action` flow.

## Delegated Boundary Note

- Keep auth, CSRF, and route ordering in `controlServer.ts`.
- Preserve session-only `ui.cancel` restrictions and parameter stripping exactly.
- Preserve duplicate-create auto-pause semantics so only newly created confirmations can advance pause state.
- Preserve the `confirmation_required` payload contract without leaking raw params.
- If `/confirmations/create` proves more coupled than expected, the fallback is to isolate the `ui.cancel` fast-path inside `/confirmations/approve` before touching the broader `/control/action` seam.
