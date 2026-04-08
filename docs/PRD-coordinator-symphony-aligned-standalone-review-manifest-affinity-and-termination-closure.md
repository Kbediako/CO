# PRD - Coordinator Symphony-Aligned Standalone Review Manifest Affinity and Termination Closure

## Summary

After `1066`, bounded standalone review now fails closed on explicit package-manager validation suites, but two reliability gaps remain in the wrapper lifecycle:

- manifest selection can still attach review evidence to the wrong prior run when `--manifest` is omitted,
- timeout/stall/boundary termination can still reject before the child process tree is fully closed.

This slice fixes those two lifecycle seams without widening into a broader process-supervisor rewrite.

## Problem

- `scripts/run-review.ts` currently resolves the evidence manifest by newest file mtime across task-scoped manifests when no explicit manifest is provided.
- In practice, that can bind a fresh standalone review to an older docs-review or implementation-gate manifest from the same task.
- The wrapper also calls `requestTermination(...)` before the child process has actually closed, which leaves partial logs and lingering child processes in the same failure shapes already seen in current `npm run review` and `npm run test` evidence.

## Goal

Make standalone review bind to the intended active task/run lineage and close bounded failures more deterministically, while keeping the wrapper thin and preserving the existing bounded-review contract.

## Non-Goals

- No generic process-supervisor redesign.
- No rewrite of the broader `codex-orchestrator` pipeline runner.
- No new review policy expansion beyond lifecycle correctness.
- No controller extraction or unrelated Symphony decomposition mixed into this lane.
- No attempt to solve every implementation-gate `npm run test` quiet-tail cause outside the standalone-review-owned surface.

## Requirements

- When standalone review is launched without an explicit `--manifest`, prefer the active run lineage instead of a raw newest-mtime pick across same-task manifests.
- Keep explicit `--manifest`, `MANIFEST`, and `CODEX_ORCHESTRATOR_MANIFEST_PATH` authoritative.
- Ensure review artifacts are written under the same resolved run lineage as the selected manifest.
- On timeout, stall, low-signal, meta-surface, heavy-command, or command-intent termination, wait for child closure using a bounded kill window instead of rejecting immediately while the process tree is still alive.
- Preserve the existing telemetry and output-log artifacts for bounded failures.

## Constraints

- Keep the change inside the standalone review wrapper and its direct helpers.
- Reuse existing runtime state and monitor surfaces where possible.
- Keep the next post-`1067` step free to return to the next real Symphony-aligned `controlServer.ts` concentration.

## Acceptance Criteria

1. Standalone review resolves the intended manifest/run lineage without attaching to an older sibling manifest from the same task by default.
2. Review artifacts and telemetry land under that same resolved run lineage.
3. Bounded review termination waits for child closure before returning failure.
4. Targeted tests cover manifest affinity and deterministic termination closure.
5. Standard guards plus `pack:smoke` are captured before closeout.
