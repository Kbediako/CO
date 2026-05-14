# ACTION_PLAN - Coordinator Symphony-Aligned Control Request Route Dispatch Shell Extraction

1. Confirm the remaining inline `handleRequest()` route-branch sequence is now the smallest worthwhile shell left in `controlServer.ts`.
2. Add a dedicated dispatcher that owns only the branch sequencing and early-return order across public, UI-session, Linear webhook, and authenticated routes.
3. Update `controlServer.ts` to delegate that sequence through the dispatcher without changing request-context assembly or helper/controller contracts.
4. Add focused tests for the extracted sequencing seam and preserve route-level behavior coverage.
5. Run the full validation lane and sync task/docs mirrors.
