# ACTION_PLAN - Coordinator Symphony-Aligned Authenticated Route Branch Shell Extraction

1. Confirm the remaining authenticated-route shell cluster still local to `controlServer.ts` and keep deeper gate/controller logic out of scope.
2. Extract a bounded helper module for authenticated-route admission, controller-context assembly, dispatch, and protected `404` fallback.
3. Update `controlServer.ts` to delegate the authenticated-route branch without changing request-entry ordering.
4. Add focused tests for the new helper seam and preserve authenticated route-level behavior coverage.
5. Run the full validation lane and sync task/docs mirrors.
