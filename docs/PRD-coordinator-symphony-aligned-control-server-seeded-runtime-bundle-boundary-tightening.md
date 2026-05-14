# PRD - Coordinator Symphony-Aligned Control Server Seeded Runtime Bundle Boundary Tightening

## Summary

After `1086`, `ControlServer.start()` no longer owns seed-file I/O, but `createControlServerSeededRuntimeAssembly(...)` and `ControlServer` still mirror the same seeded runtime pieces individually even though `requestContextShared` already groups them. This slice tightens that runtime contract to a smaller shared bundle and moves the linear advisory state filename constant to a neutral control-surface owner used by both the seed loader and the seeded-runtime assembly.

## Problem

The control startup path still carries duplicated runtime surface:
- the seeded-runtime assembly returns stores, runtime, transport, persistence, clients, and the shared request context separately,
- `ControlServer` stores most of those pieces individually even though later control flow primarily uses `requestContextShared`,
- the seed loader currently imports `LINEAR_ADVISORY_STATE_FILE` from the seeded-runtime assembly module, which leaks ownership of a shared path detail across seams.

## Goals

- Tighten the seeded-runtime assembly return contract around one shared runtime bundle.
- Let `ControlServer` consume that bundle instead of re-storing duplicated runtime pieces.
- Move the linear advisory state filename constant to a neutral owner used by both read and write paths.

## Non-Goals

- Changing control runtime behavior or persistence semantics.
- Reopening request-shell, bootstrap-lifecycle, or startup-sequence behavior.
- Changing route/controller logic.
- Broad refactors outside the seeded runtime/startup boundary.

## User Value

- Continues the Symphony-aligned thin-shell direction for the control server.
- Removes duplicated constructor/runtime surface, making later control-server extraction slices smaller and easier to verify.
- Leaves the seed-loading seam from `1086` more self-contained by removing the assembly-owned constant dependency.

## Acceptance Criteria

- `createControlServerSeededRuntimeAssembly(...)` exposes a tighter shared runtime bundle boundary instead of duplicating the same seeded runtime pieces across the return contract.
- `ControlServer` stores and consumes the tightened runtime bundle without changing runtime behavior.
- The linear advisory state filename constant is owned by a neutral control-surface module used by both `controlServerSeedLoading.ts` and `controlServerSeededRuntimeAssembly.ts`.
- Focused regressions prove shared runtime identity and persistence behavior remain intact after the contract tightening.
