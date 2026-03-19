---
id: 20260317-1251-coordinator-symphony-aligned-doctor-cli-shell-extraction
title: Coordinator Symphony-Aligned Doctor CLI Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-doctor-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-doctor-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1251-coordinator-symphony-aligned-doctor-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1250` confirmed the remaining doctor surface is still a real shell candidate. Local inspection showed that `handleDoctor(...)` still aggregates advisory/reporting flows and `--apply` orchestration above already-separated services, so the next truthful move is a bounded extraction lane rather than another freeze. Evidence: `out/1250-coordinator-symphony-aligned-doctor-apply-mutation-and-readiness-boundary-reassessment/manual/20260317T000017Z-closeout/14-next-slice-note.md`, `docs/findings/1251-doctor-cli-shell-extraction-deliberation.md`.
  - 2026-03-17: Completed. The post-parse doctor execution/output surface now lives in `orchestrator/src/cli/doctorCliShell.ts`, while `bin/codex-orchestrator.ts` keeps help/parse/validation ownership. Focused helper plus doctor-scoped CLI coverage were added to preserve JSON composition, `--apply` sequencing, and wrapper-only validation contracts. Evidence: `out/1251-coordinator-symphony-aligned-doctor-cli-shell-extraction/manual/20260317T002110Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

After `setup` moved out and `1250` reassessed the doctor surface, `handleDoctor(...)` is now the strongest remaining top-level CLI shell candidate.

## Requirements

1. Extract the doctor shell without changing user-facing CLI behavior.
2. Preserve advisory/reporting and `--apply` contracts.
3. Keep the underlying doctor/setup modules out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused doctor coverage in `tests/cli-command-surface.spec.ts`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the doctor command shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
