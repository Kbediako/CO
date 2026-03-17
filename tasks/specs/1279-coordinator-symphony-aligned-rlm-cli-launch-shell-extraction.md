---
id: 20260317-1279-coordinator-symphony-aligned-rlm-cli-launch-shell-extraction
title: Coordinator Symphony-Aligned RLM CLI Launch Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-rlm-cli-launch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-rlm-cli-launch-shell-extraction.md
related_tasks:
  - tasks/tasks-1279-coordinator-symphony-aligned-rlm-cli-launch-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1278` extracted the bounded completion/state-reporting shell. Current-tree inspection plus bounded scout evidence shows the remaining truthful nearby seam is the inline RLM launch/start path still owned by `handleRlm(...)`. Evidence: `out/1278-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction/manual/20260317T125403Z-closeout/00-summary.md`, `out/1278-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction/manual/20260317T125403Z-closeout/14-next-slice-note.md`, `docs/findings/1279-rlm-cli-launch-shell-extraction-deliberation.md`.
  - 2026-03-17: Closed after extracting `orchestrator/src/cli/rlmLaunchCliShell.ts`. The remaining local `rlm` pocket is now only binary-owned help/parse/runtime-policy glue plus a thin wrapper into the extracted launch and completion helpers, so the next truthful nearby move is `1280`, a freeze reassessment rather than another extraction. Evidence: `out/1279-coordinator-symphony-aligned-rlm-cli-launch-shell-extraction/manual/20260317T131048Z-closeout/00-summary.md`, `out/1279-coordinator-symphony-aligned-rlm-cli-launch-shell-extraction/manual/20260317T131048Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The local `rlm` wrapper still owns a bounded launch/start shell above the already-extracted completion helper and deeper runtime.

## Requirements

1. Extract goal validation, task/env shaping, launch orchestration, `Run started` output, and handoff into the completion helper out of `handleRlm(...)`.
2. Preserve the current goal-required error text, legacy alias warning, and doctor-tip behavior.
3. Keep binary-facing help/parse/repo-policy/runtime-mode ownership local in `bin/codex-orchestrator.ts`.
4. Avoid widening into `rlmRunner.ts` internals or reworking the completion helper beyond wiring.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`
