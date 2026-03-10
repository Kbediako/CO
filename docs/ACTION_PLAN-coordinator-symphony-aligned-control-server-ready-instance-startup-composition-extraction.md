# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Ready-Instance Startup Composition Extraction

1. Confirm the remaining inline `ControlServer.start()` work is now only the ready-instance startup composition over the extracted seed, request-shell, bootstrap, and startup-sequence helpers.
2. Add one dedicated helper that assembles the ready startup bundle while preserving lifecycle attachment and close-on-failure wiring.
3. Update `controlServer.ts` to delegate the ready-instance startup composition through that helper without reopening request-shell or startup-sequence behavior.
4. Add focused coverage for success-path and fail-closed startup composition while keeping broader `ControlServer` integration behavior unchanged.
5. Run the full validation lane and sync task/docs mirrors.
