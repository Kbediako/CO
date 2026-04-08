# TECH_SPEC - Coordinator Symphony-Aligned Control Runtime Boundary Extraction (1023)

## Overview
- Extract shared runtime composition from `controlServer.ts` into a dedicated internal boundary.
- Keep `controlServer.ts` as the thin route host and control-transport owner while a new runtime boundary owns shared read-model assembly plus refresh/subscribe semantics.
- Preserve current read payloads and notifier behavior while upgrading refresh from a route-local acknowledgement to a bounded runtime invalidation/reconcile path.

## Objectives
- Remove `ControlServer` as the owner of selected-run/read-model/notifier assembly.
- Introduce one narrow runtime contract closer to Symphony's `snapshot()/requestRefresh()/subscribe()` seam.
- Keep later live Linear cache/ingress work unblocked by avoiding another `ControlServer`-local runtime layer.
- Make compatibility refresh drive the runtime boundary instead of remaining a thin acknowledgment only.

## Current State
- `controlServer.ts` currently owns:
  - control/auth/session/protocol routing,
  - notifier lifecycle,
  - selected-run projection/observability assembly via local helper factories,
  - Telegram read-adapter wiring built from runtime pieces assembled inside the class,
  - refresh/read surface access through those locally created handles.
- The extracted read-side seams from `1017` through `1022` improved the shape of the pieces, but they still leave `ControlServer` as the composition hub.
- `POST /api/v1/refresh` still returns an acceptance payload without exercising any runtime-level refresh or invalidation behavior.

## Proposed Changes

### 1. Control runtime module
- Add a focused module, for example `controlRuntime.ts`, under `orchestrator/src/cli/control/`.
- The runtime should own:
  - selected-run projection reader creation,
  - observability surface creation,
  - observability notifier lifecycle,
  - a shared boundary for state/issue/dispatch/UI reads,
  - refresh request handling that invalidates and re-warms the shared read session,
  - observability `publish` / `subscribe`.
- The runtime should expose a small internal contract, for example:
  - `readState()`
  - `readIssue(issueIdentifier)`
  - `readDispatch(surface)`
  - `readUiDataset()`
  - `requestRefresh(body?)`
  - `readQuestions()` / `resolveIssueIdentifier()` where needed for Telegram
  - `publishUpdate(input?)`
  - `subscribe(listener)`

### 2. Keep protocol ownership in ControlServer
- `controlServer.ts` should continue to:
  - own HTTP route matching and status/header mapping,
  - own `/control/action` transport/auth/idempotency logic,
  - own webhook/control route entry points.
- The route host should call the runtime boundary for shared read/refresh/update behavior instead of constructing those pieces itself.

### 3. Preserve and tighten runtime semantics
- Keep the existing selected-run/public payload contracts unchanged.
- Preserve:
  - state/issue/dispatch/UI payload shaping,
  - Telegram read adapter behavior,
  - observability invalidation publish/subscribe behavior,
  - bounded refresh authorization and response shape.
- Change:
  - refresh should invalidate and warm the shared runtime session before returning the acceptance payload.

### 4. Runtime boundary shape
- Prefer a runtime boundary that matches Symphony's semantics rather than its Elixir implementation details:
  - a snapshot/read side shared by multiple consumers,
  - a refresh request boundary,
  - a subscription hook for observability-driven consumers.
- Keep the boundary internal and explicitly hardened:
  - no new public transport surface,
  - no new authority,
  - no implicit tracker writes.

## Functional Requirements
- Runtime consumers continue to receive the same payloads/behavior as the current 1022 closeout tree.
- `controlServer.ts` no longer implements shared runtime composition inline.
- Telegram continues to re-read through the shared runtime boundary instead of ad hoc local assembly.
- Refresh and observability subscription behavior do not regress.
- Compatibility refresh drives the runtime boundary rather than a route-local no-op acknowledgement.

## Non-Functional Requirements
- Keep the diff bounded to internal extraction.
- Keep the runtime boundary deterministic and directly testable.
- Avoid introducing new env vars, persisted files, or framework layers.

## Interfaces & Data Contracts
- New internal contract:
  - a `ControlRuntime`-style boundary for shared read/refresh/subscribe behavior.
- Existing external contract:
  - state/issue/dispatch/refresh/UI response shapes remain unchanged.
- Existing sidecar contracts:
  - unchanged.

## Validation Plan
- Docs-review before implementation.
- Targeted tests covering:
  - state/issue/dispatch/UI reads through the runtime boundary,
  - Telegram read adapter behavior through the runtime boundary,
  - retained observability publish/subscribe behavior,
  - retained refresh behavior and runtime invalidation/warm semantics.
- Manual mock evidence proving the shared runtime contract stays coherent across HTTP/UI/Telegram consumers.
- Full validation gate chain and explicit elegance review before closeout.

## Risks
- Behavioral drift in state/issue/dispatch/UI payloads.
- Telegram read regression if the runtime contract is incomplete.
- Over-abstracting the runtime boundary before a later Linear cache/ingress follow-up exists.
- Holding a long-lived memoized projection reader without invalidation and accidentally serving stale selected-run data.

## Mitigations
- Keep the runtime contract close to existing helpers and route behavior instead of inventing a new framework.
- Reuse current projection/observability modules instead of rewriting them.
- Preserve route/protocol ownership in `ControlServer` so the public contract stays easy to compare.
- Ensure each refresh or publish invalidates the current read session before any re-warm step.

## Out of Scope
- Live Linear cache/poller work.
- Generic auth/CSRF/session extraction from `controlServer.ts`.
- Telegram transport changes.
- Any broad Linear write surface or Symphony-style unattended issue-state automation.
