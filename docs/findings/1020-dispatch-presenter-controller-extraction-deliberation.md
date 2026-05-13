# Findings - 1020 Dispatch Presenter/Controller Extraction Deliberation

- Proceed with a narrow follow-up slice after `1019` to extract the remaining read-only `/api/v1/dispatch` seam.
- Keep the slice bounded:
  - presenter/read-side code should shape dispatch payloads and semantic outcomes,
  - `controlServer.ts` should keep method/status/header behavior and audit-event emission,
  - state/issue/refresh/UI behavior stays out of scope except for regression protection.
- Real Symphony guidance is structural, not literal:
  - upstream controller/presenter layering remains the reference,
  - CO’s extra dispatch route still needs its own hardened, fail-closed implementation.
- Do not widen scope into Telegram, Linear authority, auth/session, or mutating controls.
