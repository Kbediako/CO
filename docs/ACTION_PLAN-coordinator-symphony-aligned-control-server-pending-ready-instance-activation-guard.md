# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Pending Ready-Instance Activation Guard

1. Confirm the only remaining inline startup shell after `1121` is the mutable activation guard inside `startPendingReadyInstance(...)`.
2. Extract that activation guard into one bounded helper without changing `prepareControlServerStartupInputs(...)`, `createBoundControlServerRequestShell(...)`, or `startControlServerReadyInstanceStartup(...)`.
3. Keep lifecycle ownership on `ControlServer` while moving only the live activation shell.
4. Add focused coverage proving request-shell reader dereferencing, bootstrap attachment, and close-on-failure behavior remain unchanged.
5. Run the validation lane and sync task/docs mirrors.
