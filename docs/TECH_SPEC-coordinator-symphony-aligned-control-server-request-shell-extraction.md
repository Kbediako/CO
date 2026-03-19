# TECH_SPEC - Coordinator Symphony-Aligned Control Server Request Shell Extraction

## Summary

Extract the inline `http.createServer(...)` request shell from `ControlServer.start()` into one helper so the server method keeps token/seed loading, seeded runtime assembly, instance construction, bootstrap assembly, startup sequencing, and ready-instance return while the per-request shell moves behind a bounded seam.

## Current State

After `1084`, `ControlServer.start()` still performs these inline request-shell steps before the `ControlServer` instance is returned:

1. Declare a nullable `instance` placeholder.
2. Create `http.Server` with inline request handling.
3. Return `503 control_server_unavailable` before the instance exists.
4. Build `ControlRequestContext` from `instance.requestContextShared`, `req`, `res`, and `instance.expiryLifecycle`.
5. Invoke `handleRequest(...)`.
6. Catch top-level failures and map them to JSON responses.

That block is the last remaining request-surface shell inside `ControlServer.start()`.

## Symphony Alignment Note

The real upstream Symphony checkout keeps its web endpoint thin:
- `elixir/lib/symphony_elixir_web/endpoint.ex` wires generic request-shell middleware/plugs.
- `elixir/lib/symphony_elixir_web/router.ex` delegates route/controller behavior separately.

CO should not copy Phoenix structure literally, but this slice follows the same layering direction: keep the transport/request shell separate from the control-route authority logic.

## Proposed Design

### 1. Control-local request-shell helper

Introduce one control-local module, likely `controlServerRequestShell.ts`, whose primary exported factory is `createControlServerRequestListener(...)`. It should receive:
- a `readInstance()` callback for the eventual `ControlServer` request surface,
- a `handleRequestContext(...)` callback for the already-existing request pipeline,
- any small error-writing callback needed for top-level failure mapping.

The helper should own:
- `http.createServer(...)`,
- pre-instance `503` handling,
- `buildControlRequestContext(...)` assembly using the live shared request context plus `req`/`res`/`expiryLifecycle`,
- top-level request failure mapping into JSON responses.

### 2. `ControlServer.start()` stays the composition shell

`ControlServer.start()` should keep:
- token generation,
- JSON seed reads,
- seeded runtime assembly delegation,
- `ControlServer` instance construction,
- bootstrap assembly delegation,
- startup-sequence delegation,
- ready-instance return.

It should stop constructing the request shell inline.

### 3. Explicit exclusions

This slice must not:
- move route logic out of `handleRequest(...)`,
- change authenticated-route/controller behavior,
- change seeded runtime assembly,
- change bootstrap assembly or startup sequencing,
- alter shutdown behavior,
- split the request shell into multiple helpers/files.

## Validation

- Add a focused helper test file for the request shell.
- Keep or extend targeted `ControlServer.test.ts` coverage for:
  - pre-instance `503` responses,
  - live request-context assembly using the current shared runtime and expiry lifecycle,
  - top-level JSON error mapping.
- Run the required validation bundle and sync task/docs mirrors.
