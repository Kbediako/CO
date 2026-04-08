# PRD - Coordinator Symphony-Aligned Expiry Cycle and Timer Ownership Extraction

## Summary

After `1068`, the next highest-value Symphony-aligned seam in `controlServer.ts` is the remaining expiry/background ownership cluster: timer bootstrap plus question/confirmation expiry sweep orchestration.

This slice extracts the expiry-cycle logic into a dedicated control-local lifecycle owner so `controlServer.ts` keeps HTTP bootstrap, route wiring, SSE ownership, and Telegram bridge composition explicit while the background sweep behavior becomes a smaller, named seam.

## Problem

- `controlServer.ts` still directly owns:
  - a raw recurring expiry timer,
  - confirmation expiry sweep orchestration,
  - question expiry sweep orchestration,
  - question-expiry child-resolution triggering,
  - related control-event emission and runtime publish coupling.
- The route/controller decomposition is now much thinner, but this background lifecycle cluster still mixes runtime behavior with server bootstrap and shutdown.
- That leaves the main server entrypoint broader than the Symphony-style controller/process boundary we are aiming for.

## Goal

Extract the expiry-cycle/background ownership cluster from `controlServer.ts` into a dedicated, explicit lifecycle owner while preserving timer cadence, failure posture, event emission, and runtime publish behavior.

## Non-Goals

- No generic scheduler framework or reusable timer abstraction.
- No changes to route contracts or control auth behavior.
- No redesign of question or confirmation persistence models.
- No Telegram or Linear provider-surface changes.
- No broader runtime/container refactor in the same slice.

## Requirements

- Introduce a dedicated control-local expiry lifecycle module under `orchestrator/src/cli/control/`.
- Move the raw recurring timer plus question/confirmation expiry sweep logic out of `controlServer.ts`.
- Preserve current behavior for:
  - confirmation expiry resolution events,
  - question expiry resolution events,
  - question child-resolution fallback behavior on expiry,
  - runtime publish after question expiry,
  - fail-safe background error posture.
- Keep lifecycle control narrow and explicit, such as `start()`, `close()`, `expireConfirmations()`, and `expireQuestions()`.
- Keep question child-resolution adapter reuse explicit instead of re-embedding that logic in the new helper.
- Prevent overlapping sweeps; do not keep a naked fire-and-forget `setInterval` around child-resolution work that can await outbound control calls.
- Add focused tests for the extracted expiry-cycle seam and keep existing route/runtime coverage intact.

## Constraints

- Keep the slice bounded to expiry/background ownership.
- Avoid widening into a generic lifecycle manager or service container.
- Avoid widening into Telegram bridge lifecycle or `delegationServer.ts` sharing.
- Preserve existing persistence sequencing and emitted event payload shapes.
- Keep the next slice free to continue the remaining `controlServer.ts` reductions without redoing expiry work.

## Acceptance Criteria

1. `controlServer.ts` no longer owns the raw recurring timer or the question/confirmation expiry sweep logic directly.
2. The extracted lifecycle owner exposes a small explicit seam and prevents overlapping sweeps.
3. Expiry-triggered question child resolution, event emission, and runtime publish semantics remain unchanged.
4. Focused tests cover the extracted expiry-cycle seam and adjacent regressions remain green.
5. Standard docs-first and implementation validation gates pass on the final tree.
