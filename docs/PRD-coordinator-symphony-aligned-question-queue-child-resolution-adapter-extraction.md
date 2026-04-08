# PRD - Coordinator Symphony-Aligned Question Queue Child-Resolution Adapter Extraction

## Summary

After the standalone-review reliability detour through `1060`-`1067`, the next highest-value Symphony-alignment seam is back in `controlServer.ts`: the question/delegation child-resolution support cluster that still sits beside the already-extracted question route controller.

This slice extracts that support cluster into a dedicated adapter module so the controller-owned question flow stays explicit, while `controlServer.ts` sheds another concentration of delegation/runtime detail.

## Problem

- `questionQueueController.ts` already owns the route contract for `GET /questions`, `POST /questions/enqueue`, `POST /questions/answer`, `POST /questions/dismiss`, and `GET /questions/:id`.
- `authenticatedRouteComposition.ts` already wires that controller through explicit callbacks.
- But `controlServer.ts` still owns a dense question/delegation support cluster:
  - delegation-header parsing and validation,
  - run-manifest validation,
  - child-question auto-resolution,
  - child control-endpoint loading and HTTP calls,
  - run-root and token-path safety checks.
- That leaves the question flow split across controller/composition and a large route-local helper block, which is still farther from the Symphony-style controller/helper boundary than the rest of the extracted surfaces.

## Goal

Extract the question/delegation child-resolution support cluster from `controlServer.ts` into a dedicated adapter that preserves current behavior exactly and keeps authority boundaries explicit.

## Non-Goals

- No route-contract changes for the existing question endpoints.
- No broad unification with `delegationServer.ts` in this lane.
- No new public endpoint or provider integration work.
- No wider question model redesign, persistence redesign, or control-runtime redesign.
- No attempt to solve every remaining `controlServer.ts` concentration in the same slice.

## Requirements

- Move question/delegation support helpers from `controlServer.ts` into a dedicated module under `orchestrator/src/cli/control/`.
- Keep `questionQueueController.ts` unchanged in responsibility: it should still own route parsing and response behavior.
- Keep `authenticatedRouteComposition.ts` explicit: it should forward named callbacks and not collapse into a generic container.
- Preserve current behavior for:
  - delegation header parsing,
  - delegation token validation,
  - manifest/run-id validation,
  - auto-resolution on answer/dismiss/expiry/list replay,
  - child control endpoint auth, timeout, and fail-safe logging.
- Preserve path-safety rules for manifest and token paths.
- Add focused tests around the extracted adapter seam instead of widening unrelated route coverage.

## Constraints

- Keep the extraction bounded to the question/delegation child-resolution support cluster.
- Avoid introducing a generic service locator or framework-like dependency container.
- Maintain the current fail-safe posture: resolution failures remain non-fatal and auditable.
- Keep the next slice free to continue the authenticated/control/controller decomposition without redoing this question support work.

## Acceptance Criteria

1. `controlServer.ts` no longer owns the question/delegation child-resolution helper cluster directly.
2. Question route behavior remains unchanged for delegation auth, enqueue validation, answer/dismiss handling, and child-resolution retries.
3. The extracted adapter is covered by focused tests plus the existing route/controller regressions.
4. Standard docs-first and implementation validation gates pass on the final tree.
5. The post-implementation review/elegance pass confirms the seam stayed explicit and bounded.
