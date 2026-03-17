# PRD: Coordinator Symphony-Aligned Codex Setup And Defaults CLI Shell Extraction

## Summary

Extract the remaining inline `codex setup` / `codex defaults` command shell family from `bin/codex-orchestrator.ts` into a dedicated orchestrator CLI module.

## Problem

The underlying engines already live in `orchestrator/src/cli/codexCliSetup.ts` and `orchestrator/src/cli/codexDefaultsSetup.ts`, but the top-level CLI file still owns a non-trivial `handleCodex(...)` shell for:

- shared subcommand dispatch and help gating
- per-subcommand flag-to-engine mapping
- JSON/text output shaping
- wrapper-only application of `--yes`, `--force`, and setup source/ref/download inputs

That remaining command family is still mixed into the top-level CLI entrypoint.

## Goal

Move the inline `codex setup` / `codex defaults` shell family behind a dedicated boundary without changing user-facing behavior.

## Non-Goals

- changing the underlying managed-CLI or defaults engines
- widening into shared top-level parser/help helpers
- broad refactors of unrelated top-level command families

## Success Criteria

- the inline `codex` setup/defaults shell logic moves into a dedicated orchestrator CLI module
- behavior stays unchanged for help gating, flag mapping, JSON/text output, and subcommand routing
- focused parity coverage exists for the extracted shell and wrapper-owned guards
