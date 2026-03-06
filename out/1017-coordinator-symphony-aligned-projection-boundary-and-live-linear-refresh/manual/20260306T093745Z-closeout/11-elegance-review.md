# Elegance Review

- Introduced exactly one new boundary module, `selectedRunProjection.ts`, instead of spreading more helper functions across `controlServer.ts`.
- Kept caching request-scoped and minimal. The extraction removes duplicate dispatch evaluation inside one request without inventing a new long-lived cache or cross-request memoization layer.
- Preserved existing control ownership: auth, webhook intake, mutation endpoints, and Telegram wiring remain in `controlServer.ts`; the new module is read-side only.
- Reused the extracted reader across `/ui/data.json`, `/api/v1/state`, `/api/v1/:issue`, and `/api/v1/dispatch` rather than creating per-route shape builders.
- Did not broaden Linear authority, add new env contracts, or change Telegram behavior.

Verdict: minimal for the slice. The remaining complexity now belongs in a narrower observability-surface extraction, not in reverting or broadening this module.
