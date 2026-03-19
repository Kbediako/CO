# PRD: Coordinator Symphony-Aligned RLM CLI Request Shell Extraction

## Summary

After `1294` confirmed that the current local `rlm` wrapper is still broader than thin parse/help glue, the next truthful nearby move is a bounded request-shell extraction.

## Problem

`handleRlm(...)` in `bin/codex-orchestrator.ts` still owns binary-facing request shaping above the extracted launch and completion shells:

- runtime-mode selection
- repo-config required-policy application
- goal collection from args / flags / env
- explicit collab-choice detection
- task / parent-run / approval-policy shaping
- completion-shell wiring

That is a real remaining seam, not only shared binary glue.

## Goal

Extract the current RLM request-shaping surface into a focused helper while preserving the existing launch and completion contracts.

## Non-Goals

- changing deeper RLM runtime behavior
- reopening launch or completion-shell ownership
- widening into unrelated CLI families

## Success Criteria

- the remaining binary-facing RLM request shaping moves out of `handleRlm(...)`
- `handleRlm(...)` becomes a thin parse/help wrapper
- focused parity covers the extracted helper and preserves current launch/completion behavior
