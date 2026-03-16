---
id: 20260316-1244-coordinator-symphony-aligned-delegation-setup-fallback-config-parser-extraction
title: Coordinator Symphony-Aligned Delegation Setup Fallback Config Parser Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-delegation-setup-fallback-config-parser-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-setup-fallback-config-parser-extraction.md
related_tasks:
  - tasks/tasks-1244-coordinator-symphony-aligned-delegation-setup-fallback-config-parser-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1243` froze the nearby devtools family and bounded scout plus local inspection identified the fallback config parser cluster in `delegationSetup.ts` as the next truthful parser-vs-orchestration seam. Evidence: `docs/findings/1244-delegation-setup-fallback-config-parser-extraction-deliberation.md`, `out/1243-coordinator-symphony-aligned-devtools-readiness-boundary-freeze-reassessment/manual/20260316T115918Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Closeout completed after extracting the parser to `orchestrator/src/cli/utils/delegationConfigParser.ts`, landing review-driven inline TOML parity fixes, and finishing the validation lane with focused `10/10` plus full-suite `1764/1764` evidence; the only non-green item is the unrelated pre-existing `rlmRunner.ts` build break. Evidence: `out/1244-coordinator-symphony-aligned-delegation-setup-fallback-config-parser-extraction/manual/20260316T121446Z-closeout/00-summary.md`, `out/1244-coordinator-symphony-aligned-delegation-setup-fallback-config-parser-extraction/manual/20260316T121446Z-closeout/13-override-notes.md`.
---

# Technical Specification

## Context

`delegationSetup.ts` still owns fallback config parsing inline. That parser cluster is cohesive enough to extract without reopening broader delegation policy.

## Requirements

1. Extract the fallback parser helpers from `delegationSetup.ts`.
2. Preserve current setup fallback behavior and pinned-repo interpretation.
3. Keep the lane bounded to parser ownership and focused call-site parity.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused delegation setup parser tests
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`

## Exit Conditions

- `go`: parser ownership is extracted and focused regressions pass
- `no-go`: extraction would widen into broader setup or policy work
