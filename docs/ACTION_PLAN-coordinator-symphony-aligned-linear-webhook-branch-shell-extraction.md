# ACTION_PLAN - Coordinator Symphony-Aligned Linear Webhook Branch Shell Extraction

1. Confirm the remaining `/integrations/linear/webhook` branch shell is still local to `controlServer.ts` and keep deeper controller logic out of scope.
2. Add one controller-owned Linear webhook branch entrypoint for pathname detection and controller-input assembly.
3. Update `controlServer.ts` to delegate the Linear webhook branch through that controller-owned entrypoint without changing request-entry ordering.
4. Add focused tests for the new helper seam and preserve existing route-level Linear webhook behavior coverage.
5. Run the full validation lane and sync task/docs mirrors.
