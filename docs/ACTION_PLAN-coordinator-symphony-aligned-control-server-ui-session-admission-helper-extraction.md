# ACTION_PLAN - Coordinator Symphony-Aligned Control Server UI Session Admission Helper Extraction

1. Confirm the remaining UI session admission assembly cluster still local to `controlServer.ts` and keep `uiSessionController.ts` contract logic out of scope.
2. Extract the bounded helper module for `/auth/session` wiring, allowed-host normalization, and loopback-address admission ownership.
3. Update `controlServer.ts` to delegate the UI session admission branch without changing branch order.
4. Add focused tests for the helper seam and preserve route-level `/auth/session` behavior coverage.
5. Run the full validation lane and sync task/docs mirrors.
