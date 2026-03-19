# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction

1. Confirm the only remaining inline `ControlServer.start()` work is the pending instance host shell around the bound request shell and startup callbacks.
2. Add one same-file `private static async` helper on `ControlServer` that owns bound-server creation, pending instance construction, bootstrap attachment wiring, failure-close wiring, and the ready-instance startup call.
3. Update `ControlServer.start()` to delegate the whole mutable host-shell block to that helper and return the fully started instance.
4. Add focused coverage for live request-shell reads, bootstrap callback mutation, and close-on-failure behavior over the same instance.
5. Run the full validation lane and sync task/docs mirrors.
