# Findings - 1106 Control Server Live-Instance Host Shell Extraction

- After `1105`, the remaining inline work in `ControlServer.start()` is no longer another exported adapter seam; it is the pending host shell that bridges the bound request shell to the ready-instance startup helper.
- The smallest Symphony-aligned move is to keep this extraction inside `controlServer.ts` as a same-file `private static` helper, because the helper needs the private constructor and private fields on `ControlServer`.
- The critical invariants are:
  1. request-shell readers must keep dereferencing the live instance so `expiryLifecycle` changes become visible after bootstrap
  2. `onBootstrapAssembly(...)` must mutate the same pending instance that owns the bound server
  3. `closeOnFailure()` must close that same partially started instance
- Do not split the request-shell reader closures away from the startup callback wiring; they share the same mutable instance cell and belong in one helper that returns the fully started server.
- Do not widen this slice into another exported helper, ready-instance startup changes, or review-wrapper work.
