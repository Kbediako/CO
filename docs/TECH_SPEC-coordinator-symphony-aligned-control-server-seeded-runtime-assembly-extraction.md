# TECH_SPEC - Coordinator Symphony-Aligned Control Server Seeded Runtime Assembly Extraction

## Summary

Extract the seeded runtime assembly block from `ControlServer.start()` into one helper so the server method keeps seed loading plus server/startup-shell composition while seeded store/runtime creation, persist helpers, and `requestContextShared` assembly move behind one bounded seam.

## Current State

After `1083`, `ControlServer.start()` still performs these inline steps after the JSON seeds are loaded and before `http.createServer(...)`:

1. Construct `ControlStateStore` and inject the default `rlm` toggle when missing.
2. Construct `ConfirmationStore`, `QuestionQueue`, `DelegationTokenStore`, and `SessionTokenStore`.
3. Normalize linear advisory state and create the control runtime.
4. Create the event transport and live persist closures.
5. Assemble `requestContextShared`.

That seeded runtime assembly block is cohesive and self-contained, but it still keeps too much non-server construction inside the top-level server method.

## Proposed Design

### 1. Seeded runtime-assembly helper

Introduce one helper, likely `createControlServerSeededRuntimeAssembly(...)`, that receives:
- `runId`
- `token`
- `config`
- `paths`
- `eventStream`
- the already-loaded JSON seeds
- `sessionTtlMs`

It should own:
- `ControlStateStore` creation and default `rlm` toggle injection,
- `ConfirmationStore`, `QuestionQueue`, `DelegationTokenStore`, and `SessionTokenStore`,
- `normalizeLinearAdvisoryState(...)`,
- `createControlRuntime(...)`,
- `createControlEventTransport(...)`,
- live `persist` closure assembly,
- `requestContextShared` assembly.

It should return exactly the runtime pieces `ControlServer.start()` still needs:
- `controlStore`
- `confirmationStore`
- `questionQueue`
- `delegationTokens`
- `sessionTokens`
- `clients`
- `eventTransport`
- `persist`
- `requestContextShared`
- `linearAdvisoryState`
- `controlRuntime`

### 2. `ControlServer.start()` stays the outer shell

`ControlServer.start()` should keep:
- token generation,
- JSON seed reads,
- HTTP server/request shell creation,
- `ControlServer` instance construction,
- bootstrap assembly delegation,
- startup-sequence delegation,
- ready-instance return.

It should stop assembling the seeded runtime block inline.

### 3. Explicit exclusions

This slice must not:
- change JSON seed loading before the helper call,
- change the startup shell in `controlServerStartupSequence.ts`,
- change `createControlBootstrapAssembly(...)`,
- move route handling/controller logic,
- alter `close()` shutdown ordering,
- split the seeded runtime assembly into multiple helpers/files.

## Validation

- Add a focused helper test file for seeded runtime assembly.
- Keep/extend targeted `ControlServer.test.ts` coverage for:
  - missing-`rlm` seed default injection,
  - preserved runtime/request-context identity wiring,
  - live `persist.*` closures serializing current state instead of seed snapshots.
- Run the required validation bundle and sync task/docs mirrors.
