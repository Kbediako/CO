# PRD: Coordinator Symphony-Aligned Setup Bootstrap Shell Extraction

## Summary

After the flow pocket froze in `1248`, the next truthful top-level CLI seam is the inline `setup` bootstrap shell in `bin/codex-orchestrator.ts`.

## Problem

`handleSetup(...)` still combines several distinct setup-shell concerns in the top-level CLI file:

- plan vs apply branching
- bundled skill bootstrap command composition
- delegation and DevTools setup orchestration
- user-facing setup guidance rendering

That is broader than the thin command-entry adapters left by the recent shell extractions.

## Goal

Extract the `setup` bootstrap shell behind a dedicated boundary while preserving current `setup` CLI behavior and output.

## Non-Goals

- changing the semantics of delegation, DevTools, or skills setup modules
- changing `setup` help text or flag contracts
- widening into `doctor --apply`, `devtools setup`, or `delegation setup` subcommands

## Success Criteria

- docs-first artifacts capture the bounded `setup` shell seam
- the extracted shell owns the plan/apply orchestration and setup guidance contract
- command-surface behavior remains parity-backed by focused tests
