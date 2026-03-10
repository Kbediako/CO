# Findings - 1105 Control Server Ready-Instance Startup Composition Extraction

- `1104` removed the final inline request-shell binding from `ControlServer.start()`, leaving one remaining stateful composition block in the method.
- The remaining inline responsibilities are explicit and stable:
  1. attach bootstrap lifecycles from `createControlBootstrapAssembly(...)`
  2. run `startControlServerStartupSequence(...)` with the live instance-backed `closeOnFailure`
  3. store the resulting `baseUrl` on the ready server host
- The next smallest Symphony-aligned move is to extract only that ready-instance startup bundle composition into one helper without reopening seed loading, request-shell behavior, bootstrap internals, or startup-sequence logic.
- Do not broaden this slice into `close()` shutdown changes or review-wrapper work.
