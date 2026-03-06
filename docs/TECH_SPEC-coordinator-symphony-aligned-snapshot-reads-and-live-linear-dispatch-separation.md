# TECH_SPEC - Coordinator Symphony-Aligned Snapshot Reads + Live Linear Dispatch Separation (1024)

## Overview
- Decouple synchronous snapshot/read surfaces from live Linear provider evaluation by introducing a bounded runtime-owned advisory cache boundary.
- Keep the dispatch-specific path as the explicit live advisory read surface for now.
- Separate accepted advisory context from provisional dispatch recommendation context so `tracked` on status surfaces reflects runtime state, not request-time provider reads.

## Objectives
- Remove async live Linear fetches from `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram state/issue readers.
- Make `controlRuntime.ts` own single-flight live advisory refresh/invalidation instead of letting projection construction perform provider I/O.
- Stop using dispatch recommendation payloads as fallback `tracked` data on snapshot surfaces.
- Preserve dispatch-specific live evaluation and fail-closed behavior.
- Keep snapshot-level dispatch status visible through a synchronous config/policy summary that does not require provider I/O.
- Make the existing live-Linear ingress tests deterministic without relying on real network.

## Current State
- `selectedRunProjection.ts` currently builds `trackedPayload` from:
  - accepted advisory ingress state when present,
  - otherwise `dispatchPilotEvaluation.recommendation.tracked_issue`.
- `observabilitySurface.ts` currently calls `context.projection.readDispatchEvaluation(selected)` inside `buildCompatibilityStatePayload()`, so a first state read can trigger live Linear provider I/O.
- `buildCompatibilityIssuePayload()` and `buildSelectedRunPublicPayload()` also expose `tracked` from the selected context, which currently carries that provisional fallback.
- `controlRuntime.ts` currently primes the same async live path during refresh warm, so refresh semantics are still tied to presenter warm-up instead of a runtime-owned advisory cache.
- Real Symphony's presenter/state snapshot is built from orchestrator state only; provider refreshes happen in orchestrator flows, not inside synchronous snapshot rendering.

## Proposed Changes

### 1. Add a runtime-owned advisory cache
- Introduce a focused internal module under `orchestrator/src/cli/control/`, for example `liveLinearAdvisoryRuntime.ts`.
- The advisory runtime should own:
  - cached live advisory snapshot,
  - single-flight async refresh,
  - invalidation on `publish()`,
  - explicit refresh trigger wiring for accepted `/api/v1/refresh`,
  - cache updates after accepted Linear webhook deliveries.

### 2. Split snapshot summary from live dispatch evaluation
- Introduce a synchronous dispatch-policy summary path that:
  - reads config/kill-switch/binding posture,
  - does not call the provider,
  - is safe for snapshot/state/issue/UI rendering.
- Keep async live provider evaluation only for explicit dispatch reads.

### 3. Make selected-run projection provider-free again
- Remove async live advisory evaluation from `selectedRunProjection.ts`.
- Keep selected-run projection focused on manifest snapshot, control/question/display shaping, workspace/event shaping, and accepted tracked advisory context only.

### 4. Stop fallback `tracked` synthesis from dispatch recommendation
- Limit snapshot-level `tracked` payloads to accepted/persisted advisory context:
  - `linearAdvisoryState.tracked_issue`,
  - or the new runtime-owned advisory cache where explicitly appropriate.
- Do not synthesize `tracked` on status surfaces from `dispatchPilotEvaluation.recommendation`.

### 5. Preserve dispatch route semantics
- `/api/v1/dispatch` continues to perform explicit live advisory evaluation.
- Fail-closed provider behavior remains unchanged for the dispatch route.
- Dispatch payloads may still include live recommendation/tracked issue data where semantically appropriate.

### 6. Keep runtime boundary internal
- Reuse `controlRuntime.ts` and the selected-run projection seam from `1023`.
- Avoid adding a background poller or multi-provider cache service in this slice.
- Keep route ownership in `controlServer.ts`.

## Functional Requirements
- Snapshot surfaces return without performing live provider reads.
- Runtime refresh owns advisory invalidation/single-flight refresh behavior.
- Snapshot/issue/UI/Telegram `tracked` payloads reflect accepted advisory context only.
- Dispatch-specific reads still produce live recommendation/failure payloads.
- Ingress tests for invalid signatures and out-of-scope deliveries become deterministic without live fetches.
- Existing accepted-advisory snapshot behavior remains intact.

## Non-Functional Requirements
- Keep the diff bounded to read-surface semantics and adjacent tests.
- Avoid new env vars, persisted files, or lifecycle services.
- Preserve current advisory-only and fail-closed posture.

## Interfaces & Data Contracts
- Internal:
  - selected-run projection keeps a runtime-state-only selected context,
  - dispatch evaluation remains available separately for explicit dispatch reads,
  - snapshot surfaces may consume a synchronous dispatch policy summary.
- External:
  - `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram read payload shapes stay stable,
  - `/api/v1/dispatch` remains the explicit live advisory route.

## Validation Plan
- Docs-review before implementation.
- Targeted tests covering:
  - invalid-signature and out-of-scope Linear webhook cases without live fetch dependence,
  - snapshot/issue/UI surfaces remaining tracked-null when no advisory ingress was accepted,
  - accepted advisory ingress still surfacing tracked context correctly,
  - dispatch route still performing live evaluation with fail-closed behavior.
- Manual mock evidence showing:
  - state/issue/UI do not fetch the provider,
  - dispatch still does when explicitly requested.
- Full validation gate chain and explicit elegance review before closeout.

## Risks
- Regressing snapshot-level `dispatch_pilot` visibility while removing provider reads.
- Accidentally changing the meaning of dispatch-specific payloads while cleaning up snapshot semantics.
- Over-correcting toward "no provider reads anywhere" and removing useful explicit dispatch behavior.

## Mitigations
- Keep the semantic split explicit: snapshot summary vs dispatch evaluation.
- Reuse existing tracker-dispatch helpers instead of inventing a new provider layer.
- Lock the changed semantics with targeted tests and manual evidence.

## Out of Scope
- Poller cadence or broader background worker.
- New webhook/provider storage schemas.
- Telegram transport changes.
- Broad `controlServer.ts` protocol refactors.
