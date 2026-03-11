# Findings - 1121 Control Server Startup Input Prep Extraction

- `1106` already removed the last strong mutable `ControlServer.start()` seam. What remains is the weaker startup-input prep block before `startPendingReadyInstance(...)`.
- The smallest truthful Symphony-aligned move is to isolate that startup-input prep, not to reopen the ready-instance startup helper or request shell seams that were already extracted and validated.
- The critical invariants are:
  1. control-token generation must stay coupled to the runtime inputs passed into startup
  2. seed-loading and seeded-runtime assembly behavior must remain unchanged
  3. the final handoff into `startPendingReadyInstance(...)` must keep the same prepared inputs and ordering
- Prefer a same-file/private helper unless implementation proves a tiny control-local module is clearly more readable; this is a thin-shell extraction, not a new public abstraction.
- Do not widen this slice into review-wrapper work or broader control runtime refactors.
