# 1233 Deliberation: Control Request and Action Dispatch Boundary Reassessment

- Risk stays below the full-deliberation threshold because the candidate continuation is read-only and meant to prevent a synthetic extraction.
- Bounded scout evidence after the `1232` delegation-server freeze pointed to the control request/action dispatch family as the next broader subsystem worth reassessing.
- The strongest reason to look here next is that request admission, authority checks, action normalization, confirmation validation, sequencing, persistence, and runtime publication all still coordinate across a tight route/controller boundary.
- The main risk is security and sequencing drift: if a future extraction is mis-scoped, manifest-root validation, header/auth checks, replay/idempotency handling, or pause/resume/cancel traceability could regress.
