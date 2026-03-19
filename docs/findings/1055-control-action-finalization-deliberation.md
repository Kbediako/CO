# 1055 Control Action Finalization Deliberation

- Boundary chosen: extract a dedicated `controlActionFinalization.ts` helper that builds replay/applied success response data and audit payload data, while leaving actual persistence, runtime publish, nonce durability, confirmation authority, and raw response writes in `controlServer.ts`.
- Why this is the next smallest useful seam:
  - `1054` already isolated replay/update execution.
  - `controlServer.ts` now mostly carries finalization planning around that typed execution result.
  - Replay finalization is still duplicated between the pre-confirm replay branch and the post-execution replay branch.
- What should move:
  - replay/applied response selection around the existing outcome builders;
  - audit payload shaping (`outcome`, canonical ids, traceability, snapshot);
  - a typed finalization plan surface that preserves upstream `persistRequired` / `publishRequired`.
- What should stay:
  - route ordering, auth/CSRF gating, request reads, confirmation authority;
  - transport nonce consume/rollback durability and actual persistence calls;
  - actual `runtime.publish(...)`, actual `emitControlActionAuditEvent(...)`, and raw HTTP writes.
- Over-scope warning:
  - Do not turn `1055` into a generic `handleControlActionRequest(...)` controller extraction.
  - Do not move side-effect execution or confirmation ownership out of `controlServer.ts`.
