# ACTION_PLAN - Coordinator Symphony-Aligned Control Request Controller Shell Extraction

1. Confirm the remaining inline `handleRequest()` work is now only the request-controller shell above the extracted pre-dispatch helper and route dispatcher.
2. Add one dedicated request-controller helper that owns null fallthrough plus dispatch handoff.
3. Update `controlServer.ts` to delegate `handleRequest()` to that helper.
4. Add focused coverage for the extracted request-controller seam while preserving downstream behavior tests.
5. Run the full validation lane and sync task/docs mirrors.
