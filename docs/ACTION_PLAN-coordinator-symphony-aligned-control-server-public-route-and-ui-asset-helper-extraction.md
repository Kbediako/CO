# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Public Route and UI Asset Helper Extraction

1. Confirm the exact public-route/UI-asset helper cluster still local to `controlServer.ts` and keep the session/loopback boundary out of scope.
2. Extract the bounded helper module for `/health`, `/`, asset resolution, and static asset serving.
3. Update `controlServer.ts` to delegate the public-route helper branch without changing branch order.
4. Add focused tests for the helper seam and preserve route-level behavior coverage.
5. Run the full validation lane and sync task/docs mirrors.
