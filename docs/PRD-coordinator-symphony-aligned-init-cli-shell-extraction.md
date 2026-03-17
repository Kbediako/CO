# PRD: Coordinator Symphony-Aligned Init CLI Shell Extraction

## Summary

`handleInit(...)` in `bin/codex-orchestrator.ts` still owns a bounded top-level `init` shell above the existing `orchestrator/src/cli/init.ts` and `orchestrator/src/cli/codexCliSetup.ts` helpers.

## Problem

After `1267` froze the remaining local devtools pocket, the next nearby truthful shell boundary is the top-level `init` wrapper. It still owns:

- help gating for `init`
- template validation for `init codex`
- cwd and force resolution for `initCodexTemplates(...)`
- summary emission through `formatInitSummary(...)`
- the optional `--codex-cli` follow-on setup flags, `runCodexCliSetup(...)` invocation, and summary emission

The deeper template-copy behavior already lives in `orchestrator/src/cli/init.ts`, while managed Codex setup already lives in `orchestrator/src/cli/codexCliSetup.ts`, so the remaining binary-local work is a real shell seam rather than parser glue.

## Goal

Extract the binary-facing `init` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing template copy behavior inside `orchestrator/src/cli/init.ts`
- changing managed Codex setup behavior inside `orchestrator/src/cli/codexCliSetup.ts`
- widening into unrelated top-level parser/help helpers or neighboring command families

## Success Criteria

- the inline `init` shell is extracted behind a dedicated boundary
- `init codex` validation, summary rendering, and optional `--codex-cli` follow-on behavior remain identical
- focused parity coverage exists where the extraction needs it
