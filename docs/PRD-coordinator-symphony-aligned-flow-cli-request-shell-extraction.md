# PRD: Coordinator Symphony-Aligned Flow CLI Request Shell Extraction

## Summary

`handleFlow(...)` still owns a broad binary-facing request-shaping layer above `orchestrator/src/cli/flowCliShell.ts`.

## Problem

The current `flow` wrapper in `bin/codex-orchestrator.ts` still bundles:

- format, execution-mode, and runtime-mode resolution
- repo-config required-policy application
- auto issue-log enablement
- task/parent-run/approval-policy/target-stage shaping
- UI wrapping and helper injection

That ownership is broader than thin parse/help glue and remains a real Symphony-aligned seam.

## Goal

Extract the remaining `flow` request shell into a dedicated helper while leaving shared parse/help ownership in the binary and preserving current command behavior.
