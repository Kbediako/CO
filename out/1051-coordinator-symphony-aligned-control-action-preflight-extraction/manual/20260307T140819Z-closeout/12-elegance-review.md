# 1051 Elegance Review

- Verdict: accepted as the smallest viable extraction.
- Why it stays minimal:
  - `controlActionPreflight.ts` owns only the route-local `/control/action` preflight surface: request parsing, normalization, transport validation, confirmation-scope transport re-resolution, replay shaping, and canonical traceability derivation.
  - `controlServer.ts` still owns the higher-authority seams: auth/CSRF/runner-only gating, the route shell and response writes, confirmation persistence, control mutation, runtime publish, and audit emission.
  - No new shared controller hierarchy or generalized control abstraction was introduced beyond the narrow helper surface required to lift the inline preflight code.
- Residual `P3` note:
  - Transport replay lookup still exists in both `controlActionPreflight.ts` and `controlState.ts`.
  - That duplication is real but belongs to a deeper state-layer follow-up, not this bounded preflight extraction.
- No further reduction is warranted in this slice without collapsing the seam back into `controlServer.ts`.
