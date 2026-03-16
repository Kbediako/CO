---
id: 20260316-1249-coordinator-symphony-aligned-setup-bootstrap-shell-extraction
title: Coordinator Symphony-Aligned Setup Bootstrap Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-setup-bootstrap-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-setup-bootstrap-shell-extraction.md
related_tasks:
  - tasks/tasks-1249-coordinator-symphony-aligned-setup-bootstrap-shell-extraction.md
review_notes:
  - 2026-03-16: Opened after `1248` froze the post-flow pocket. Local inspection showed that `handleSetup(...)` still mixes plan/apply branching, bundled-skill bootstrap composition, delegation/DevTools orchestration, and setup guidance rendering in the top-level CLI file while the underlying setup modules already exist outside it. Evidence: `out/1248-coordinator-symphony-aligned-flow-cli-remaining-boundary-freeze-reassessment/manual/20260316T195539Z-closeout/14-next-slice-note.md`, `docs/findings/1249-setup-bootstrap-shell-extraction-deliberation.md`.
  - 2026-03-16: Completed by extracting the setup bootstrap shell into `orchestrator/src/cli/setupBootstrapShell.ts`, leaving `bin/codex-orchestrator.ts` as the parse/help wrapper. Focused setup parity passed, bounded review returned no findings after the stale-import and helper-text-plan coverage fixes, and the honest carry-forwards are the unrelated `rlmRunner.ts` build break plus the recurring local full-suite quiet-tail after the final visible `tests/cli-orchestrator.spec.ts` pass. Evidence: `out/1249-coordinator-symphony-aligned-setup-bootstrap-shell-extraction/manual/20260316T200645Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

After the flow pocket froze, the next real top-level CLI shell seam is `handleSetup(...)`.

## Requirements

1. Extract the `setup` bootstrap shell without changing user-facing CLI behavior.
2. Move setup guidance helpers with the shell if they remain coupled.
3. Preserve plan/apply branching and output parity.
4. Keep the underlying setup modules out of scope.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused `tests/cli-command-surface.spec.ts` setup coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the setup bootstrap shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
