# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Startup Input Prep Extraction

1. Confirm the only remaining inline `ControlServer.start()` work is startup-input preparation: control-token generation, seed-loading delegation, seeded-runtime assembly, and handoff into `startPendingReadyInstance(...)`.
2. Extract that startup-input preparation into one bounded helper, preferring a same-file/private shape unless a tiny control-local helper module is clearly cleaner.
3. Update `ControlServer.start()` to delegate to the extracted helper and then to `startPendingReadyInstance(...)`.
4. Add focused coverage proving the prepared runtime inputs and ready-instance startup handoff remain unchanged.
5. Run the validation lane and sync task/docs mirrors.
