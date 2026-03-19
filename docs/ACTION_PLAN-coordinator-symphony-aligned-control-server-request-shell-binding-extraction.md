# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Request-Shell Binding Extraction

1. Confirm the remaining inline `ControlServer.start()` work is now only the request-shell binding assembly over the extracted request controller path.
2. Add one dedicated helper that binds `createControlServerRequestShell(...)` to `handleControlRequest`.
3. Update `controlServer.ts` to delegate the request-shell binding through that helper while preserving the live runtime reader closure.
4. Add focused coverage for the extracted binding seam while preserving existing request-shell behavior tests.
5. Run the full validation lane and sync task/docs mirrors.
