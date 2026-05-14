# PRD - Coordinator Symphony-Aligned Control Server Shutdown Shell Extraction

## Summary

After `1122`, the startup side of `ControlServer` is thinned into bounded helpers. The largest remaining inline lifecycle shell is now `ControlServer.close()`, which still mixes expiry teardown, bootstrap teardown, client termination, and the final `server.close()` promise wrapper.

## Problem

`ControlServer.close()` currently owns four shutdown concerns inline:
- closing and nulling the expiry lifecycle,
- closing and nulling the bootstrap lifecycle,
- ending connected SSE/http clients,
- wrapping `server.close()` in a promise.

That is the next truthful Symphony-aligned seam after `1122`, but it must stay tightly bounded and must not reopen startup helpers, request routing, or broader lifecycle policy.

## Goals

- Extract the shutdown shell into one bounded helper or same-file private seam.
- Keep `ControlServer` focused on orchestration, public runtime ownership, and the external `close()` contract.
- Preserve teardown ordering and idempotent post-close field reset behavior exactly.

## Non-Goals

- Changes to startup-input preparation or startup sequencing.
- Changes to request-shell binding, request routing, or bootstrap assembly internals.
- Changes to event transport behavior.
- Review-wrapper work.

## User Value

- Continues the Symphony-aligned thinning of the control-server composition root without weakening CO’s authority model.
- Makes shutdown ownership explicit and easier to reason about while preserving the current runtime contract.

## Acceptance Criteria

- `ControlServer.close()` no longer owns the full inline shutdown shell beyond delegating to one bounded helper and returning its promise.
- The extracted seam owns only expiry lifecycle teardown/reset, bootstrap lifecycle teardown/reset, open-client termination, and the final `server.close()` promise wrapper.
- Startup helpers, request routing, and public close semantics remain unchanged.
- Focused regression coverage proves teardown ordering and post-close field reset behavior stay identical.
