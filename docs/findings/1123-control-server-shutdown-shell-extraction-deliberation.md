# Findings - 1123 Control Server Shutdown Shell Extraction

- Date: 2026-03-12
- Task: `1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction`

## Deliberation

- After `1122`, the startup side of `ControlServer` is already split into bounded helpers. The remaining largest inline lifecycle shell is `close()`, not another startup refactor.
- The truthful next seam is narrow: expiry teardown/reset, bootstrap teardown/reset, open-client termination, and the final `server.close()` promise wrapper.
- Startup helpers, request-shell binding, request routing, and event transport are already outside this seam and should remain out of scope.

## Review Approval

- Approved for docs-first registration as the next bounded Symphony-aligned `ControlServer` slice after `1122`.
