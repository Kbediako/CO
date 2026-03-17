# PRD: Coordinator Symphony-Aligned Self-Check CLI Shell Extraction

## Summary

After `1280` froze the remaining local `rlm` pocket, the next truthful nearby binary-facing shell candidate is the still-inline `self-check` wrapper in `bin/codex-orchestrator.ts`.

## Problem

`handleSelfCheck(...)` still owns a small but real binary-facing shell above `orchestrator/src/cli/selfCheck.ts`:

- local `--format json` mode selection
- `buildSelfCheckResult()` invocation
- text/json output shaping for the command surface

That output wrapper is still inline in the binary instead of sitting behind a dedicated CLI shell helper.

## Goal

Extract the bounded `self-check` output shell into `orchestrator/src/cli/` while keeping top-level parse/dispatch ownership local in the binary.

## Non-Goals

- changing the underlying `buildSelfCheckResult()` data contract
- widening into unrelated nearby command families
- reworking shared parser helpers or command dispatch

## Success Criteria

- `handleSelfCheck(...)` becomes a thin parse/help wrapper
- the text/json emission contract moves into a dedicated `self-check` CLI shell helper
- focused parity proves the command surface is unchanged
