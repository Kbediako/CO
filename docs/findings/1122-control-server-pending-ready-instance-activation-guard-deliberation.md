# Findings - 1122 Control Server Pending Ready-Instance Activation Guard

- `1121` removed the startup-input preparation seam from `ControlServer.start()`. The remaining truthful startup seam is now the mutable activation guard inside `startPendingReadyInstance(...)`.
- The smallest Symphony-aligned next move is to isolate the live activation shell, not to reopen `prepareControlServerStartupInputs(...)`, request-shell binding internals, or the downstream ready-instance startup helper.
- The critical invariants are:
  1. request-shell readers must keep dereferencing the same live `instance` cell so `expiryLifecycle` becomes visible only after bootstrap attachment
  2. `onBootstrapAssembly(...)` and `closeOnFailure()` must still operate on that same partially started instance
  3. ordering must remain: bind request shell, construct `ControlServer`, attach bootstrap state, run startup sequence, then publish `baseUrl` and return
- Prefer a same-file/private helper unless a tiny control-local module is clearly cleaner; do not broaden into request routing, bootstrap internals, or close-order refactors.
