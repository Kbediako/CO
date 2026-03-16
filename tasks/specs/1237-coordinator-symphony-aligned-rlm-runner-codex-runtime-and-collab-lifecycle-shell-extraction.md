---
id: 20260316-1237-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned RLM Runner Codex Runtime and Collab Lifecycle Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1237-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1236` froze the control bootstrap and Telegram oversight pocket and local inspection plus focused RLM tests confirmed that `rlmRunner.ts` still owns a mixed runtime and collab lifecycle boundary above the already-separated iterative and symbolic cores. Evidence: `docs/findings/1237-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction-deliberation.md`, `out/1236-coordinator-symphony-aligned-control-bootstrap-and-telegram-oversight-contract-reassessment/manual/20260316T084431Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Closeout completed. Extracted the runtime and collab shell into `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`, kept `orchestrator/src/cli/rlmRunner.ts` as the top-level orchestration owner, and kept the explicit carry-forwards to the recurring local full-suite quiet-tail and bounded review drift recorded in the closeout packet. Evidence: `out/1237-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction/manual/20260316T092106Z-closeout/00-summary.md`, `out/1237-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction/manual/20260316T092106Z-closeout/13-override-notes.md`.
---

# Technical Specification

## Context

The iterative and symbolic RLM cores are already extracted, but `rlmRunner.ts` still owns runtime Codex command resolution, `codex exec` and JSONL completion handling, collab lifecycle parsing and validation, feature-key negotiation, and the final handoff into those cores.

## Requirements

1. Extract the remaining Codex runtime and collab lifecycle shell from `orchestrator/src/cli/rlmRunner.ts`.
2. Keep `orchestrator/src/cli/rlm/runner.ts` and `orchestrator/src/cli/rlm/symbolic.ts` as consumer anchors rather than widening the lane into core-loop rewrites.
3. Preserve runtime command resolution, non-interactive env shaping, JSONL handling, collab lifecycle validation, feature-key negotiation, and role-policy behavior.
4. Keep CLI parsing, top-level state writing, and final runner orchestration in `rlmRunner.ts`.
5. Cover the extraction with focused RLM regression tests.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM regressions
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `go`: runtime Codex command resolution and collab lifecycle handling are extracted behind a bounded helper while focused RLM contracts stay green
- `no-go`: the attempted extraction would blur ownership or regress symbolic multi-agent lifecycle guarantees
