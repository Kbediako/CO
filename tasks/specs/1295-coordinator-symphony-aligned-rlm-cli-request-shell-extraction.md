---
id: 20260318-1295-coordinator-symphony-aligned-rlm-cli-request-shell-extraction
title: Coordinator Symphony-Aligned RLM CLI Request Shell Extraction
status: done
owner: Codex
created: 2026-03-18
last_review: 2026-03-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-rlm-cli-request-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-rlm-cli-request-shell-extraction.md
related_tasks:
  - tasks/tasks-1295-coordinator-symphony-aligned-rlm-cli-request-shell-extraction.md
review_notes:
  - 2026-03-18: Opened after `1294` confirmed that `handleRlm(...)` still owns a real binary-facing request-shaping seam above `orchestrator/src/cli/rlmLaunchCliShell.ts` and `orchestrator/src/cli/rlmCompletionCliShell.ts`. The next truthful nearby move is a bounded request-shell extraction that leaves parse/help in the binary and keeps launch/completion ownership in the existing RLM helpers. Evidence: `out/1294-coordinator-symphony-aligned-rlm-cli-boundary-reassessment-revisit/manual/20260318T045148Z-closeout/00-summary.md`, `out/1294-coordinator-symphony-aligned-rlm-cli-boundary-reassessment-revisit/manual/20260318T045148Z-closeout/14-next-slice-note.md`, `docs/findings/1295-rlm-cli-request-shell-extraction-deliberation.md`.
  - 2026-03-18: Closed after extracting `orchestrator/src/cli/rlmCliRequestShell.ts`. `bin/codex-orchestrator.ts` now keeps only local parse/help ownership plus a thin handoff, while launch/completion ownership remains in `orchestrator/src/cli/rlmLaunchCliShell.ts` and `orchestrator/src/cli/rlmCompletionCliShell.ts`. Evidence: `out/1295-coordinator-symphony-aligned-rlm-cli-request-shell-extraction/manual/20260318T045148Z-closeout/00-summary.md`, `out/1295-coordinator-symphony-aligned-rlm-cli-request-shell-extraction/manual/20260318T045148Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The remaining `rlm` wrapper logic is still broader than thin binary glue.

## Requirements

1. Extract the bounded `rlm` request shell.
2. Preserve current launch and completion behavior.
3. Add focused parity for the extracted helper.
4. Avoid widening into deeper runtime internals or unrelated CLI families.
