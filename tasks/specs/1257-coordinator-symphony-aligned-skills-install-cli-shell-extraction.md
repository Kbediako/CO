---
id: 20260317-1257-coordinator-symphony-aligned-skills-install-cli-shell-extraction
title: Coordinator Symphony-Aligned Skills Install CLI Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-skills-install-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-skills-install-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1257-coordinator-symphony-aligned-skills-install-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1256` froze the remaining local `codex` pocket. Current-tree inspection shows `handleSkills(...)` still owns a bounded `skills install` shell above `orchestrator/src/cli/skills.ts`, so the next truthful nearby move is a dedicated skills CLI shell extraction lane. Evidence: `out/1256-coordinator-symphony-aligned-codex-cli-remaining-boundary-freeze-reassessment/manual/20260317T014124Z-closeout/14-next-slice-note.md`, `docs/findings/1257-skills-install-cli-shell-extraction-deliberation.md`.
  - 2026-03-17: Completed. `handleSkills(...)` now delegates the install subcommand family to `orchestrator/src/cli/skillsCliShell.ts`, preserving help gating, flag mapping, JSON/text output, and unknown-subcommand handling with focused helper and CLI parity coverage. Evidence: `out/1257-coordinator-symphony-aligned-skills-install-cli-shell-extraction/manual/20260317T015522Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

The top-level `skills` command family still owns a real shell above the already-separated skills installer engine.

## Requirements

1. Extract the inline `skills install` shell without changing user-facing behavior.
2. Preserve help gating, flag mapping, JSON/text output, and unknown-subcommand handling.
3. Keep the underlying skills installer engine out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused skills CLI coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `skills install` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
