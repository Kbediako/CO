# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Context

`1154` finished thinning `ControlServer` into a public handle plus adjacent lifecycle helpers. The next meaningful orchestration duplication is now one layer up in `orchestrator.ts`: both `start()` and `resume()` create the event stream, compute effective delegation config, optionally start the control server, attach the run-event adapter, and perform the same guarded teardown sequence in `finally`.

## In Scope

- Add one bounded helper adjacent to `orchestrator.ts` that owns the shared control-plane lifecycle shell
- Rewire `Orchestrator.start()` and `Orchestrator.resume()` to delegate the duplicated control-plane setup/teardown
- Preserve current runtime ordering, error handling, and control-plane semantics
- Keep focused control-plane lifecycle regressions green

## Out of Scope

- `ControlServer` and its already-extracted lifecycle helpers
- Telegram bridge/runtime internals
- Request/controller extraction in control route files
- Planner/runtime execution logic outside the duplicated control-plane lifecycle shell
- Auth/session policy or persistence-path changes

## Design

1. Introduce one adjacent orchestrator helper that owns:
   - event stream creation
   - effective delegation-config resolution
   - conditional control-server startup
   - run-event adapter attachment
   - safe teardown ordering for detach/close
2. Keep `orchestrator.ts` as the entrypoint and authority owner, but delegate the duplicated lifecycle shell through a narrow contract used by both `start()` and `resume()`.
3. Preserve existing semantics exactly:
   - same `RunEventStream.create(...)` inputs
   - same effective-config layer resolution
   - same `ControlServer.start(...)` gating when UI control is enabled
   - same on-event broadcast path and `attachRunEventAdapter(...)` behavior
   - same guarded teardown ordering in `finally`
4. Avoid reopening broader orchestrator preparation logic unless a type must move to support the shared shell.

## Validation

- Focused tests:
  - `tests/cli-orchestrator.spec.ts`
  - any new helper-local tests only if needed
- `delegation-guard`
- `spec-guard`
- `build`
- `lint`
- `test`
- `docs:check`
- `docs:freshness`
- `diff-budget`
- `review`
- `pack:smoke`
