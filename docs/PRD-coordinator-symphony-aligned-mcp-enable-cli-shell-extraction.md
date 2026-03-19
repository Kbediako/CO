# PRD: Coordinator Symphony-Aligned MCP Enable CLI Shell Extraction

## Summary

Extract the remaining `mcp enable` command shell from `bin/codex-orchestrator.ts` into a dedicated orchestrator CLI module.

## Problem

The underlying MCP enable engine already lives in `orchestrator/src/cli/mcpEnable.ts`, but the top-level CLI file still owns a non-trivial branch for:

- bespoke flag parsing and duplicate detection
- `--yes` boolean coercion
- `--format` validation
- `--servers` CSV normalization
- stray positional rejection
- text/JSON output shaping and apply-failure exit-code policy

That remaining command shell is still mixed into the top-level CLI entrypoint.

## Goal

Move the `mcp enable` shell behind a dedicated boundary without changing user-facing behavior.

## Non-Goals

- changing the underlying `runMcpEnable(...)` engine
- widening into `mcp serve`
- broad refactors of shared top-level CLI parsing helpers

## Success Criteria

- `mcp enable` shell logic moves into a dedicated orchestrator CLI module
- behavior stays unchanged for flag handling, output, and exit status
- focused parity coverage exists for the extracted shell and wrapper-only guards
