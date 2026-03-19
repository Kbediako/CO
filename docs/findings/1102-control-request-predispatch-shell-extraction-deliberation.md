# Findings - 1102 Control Request Predispatch Shell Extraction

- `1101` removed the inline route-branch choreography from `handleRequest()`, leaving a small but still-inline pre-dispatch shell as the next bounded surface.
- The remaining inline responsibilities are explicit and stable:
  1. missing `req`/`res` guard
  2. request URL parsing
  3. presenter/runtime context assembly
  4. dispatch-input shaping for `handleControlRequestRouteDispatch(...)`
- The next smallest Symphony-aligned move is to extract only that pre-dispatch shell into one helper without reopening route sequencing or deeper controller logic.
- Do not broaden this slice into request-shell startup, bootstrap, or route-dispatch behavior changes.
