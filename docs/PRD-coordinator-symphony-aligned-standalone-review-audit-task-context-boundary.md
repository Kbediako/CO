# PRD - Coordinator Symphony-Aligned Standalone Review Audit Task-Context Boundary

## Summary

`1095` completed audit evidence parity and `1096` returned a bounded clean review verdict, but the live audit wrapper still preloads review prompts with checklist and PRD content. That extra task context is useful for identity, yet it also nudges the reviewer toward broader historical/task-document inspection. This slice narrows audit-mode task context to the minimum useful identity boundary so audit reviews keep the right target without being pre-biased toward checklist/PRD expansion.

## Problem

- Audit-mode review currently injects `Task context:` plus checklist-derived bullets and PRD summary bullets directly into the prompt.
- The live `1095` audit run showed that this richer task context correlates with broader checklist/spec/history inspection instead of a bounded audit of the requested evidence surfaces.
- We still need enough task context for audit reviews to understand which checklist/PRD paths are canonical, but we do not need to preload their contents.

## Goals

- Keep audit reviews task-aware without inlining checklist/PRD content.
- Preserve explicit audit evidence surfaces and the existing meta-surface guard behavior.
- Reduce prompt pressure toward broader task/history review drift.
- Keep the change narrowly bounded to the wrapper so the next product seam can resume immediately afterward.

## Non-Goals

- Replacing the standalone review wrapper with a native review controller in this slice.
- Changing diff-mode prompt shaping.
- Relaxing or changing `review-execution-state.ts` meta-surface classification.
- Reopening the next `controlServer.ts` product seam in the same slice.

## User-Facing Outcome

- `npm run review -- --surface audit` still identifies the task and canonical checklist/PRD targets.
- Audit reviews no longer receive embedded PRD summary bullets or broader checklist content by default.
- The review wrapper becomes more Symphony-aligned: bounded control shell, explicit evidence surfaces, and less prompt-induced drift.
