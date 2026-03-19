# Elegance Review

The extracted `withControlPlaneLifecycle(...)` seam is already minimal for `1168`.

- It removes only the duplicated launch/close wrapper shared by `start()` and `resume()`.
- It keeps execution-specific behavior at the call sites through `runWithLifecycle(...)` instead of introducing a broader abstraction.
- It preserves resume's unique failure semantics via the explicit `onStartFailure` hook, which is the only truthful divergence in the seam.
- No simpler extraction would keep the same bounded responsibility without either reintroducing duplication or obscuring the resume failure contract.
