# ACTION_PLAN - Coordinator Symphony-Aligned Control Request Predispatch Shell Extraction

1. Confirm the remaining inline `handleRequest()` work is now only the pre-dispatch shell before the extracted route dispatcher.
2. Add one dedicated helper that owns missing-request fallthrough, URL parsing, presenter/runtime assembly, and dispatch-input shaping.
3. Update `controlServer.ts` to delegate through that helper before calling the existing request-route dispatcher.
4. Add focused coverage for the extracted pre-dispatch seam while preserving downstream route-dispatch behavior tests.
5. Run the full validation lane and sync task/docs mirrors.
