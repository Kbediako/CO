# Findings - 1104 Control Server Request-Shell Binding Extraction

- `1103` removed the final inline request-controller shell from `controlServer.ts`, leaving a small but still-inline request-shell binding block in `ControlServer.start()`.
- The remaining inline responsibilities are explicit and stable:
  1. call `createControlServerRequestShell(...)`
  2. pass the live runtime reader closure
  3. bind `handleRequest: handleControlRequest`
- The next smallest Symphony-aligned move is to extract only that binding assembly into one helper without reopening request-shell implementation, request-path behavior, or startup logic.
- Do not broaden this slice into bootstrap, seeded-runtime assembly, or request behavior changes.
