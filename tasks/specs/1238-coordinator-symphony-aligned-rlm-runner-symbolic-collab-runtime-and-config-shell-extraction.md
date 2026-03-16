---
id: 20260316-1238-coordinator-symphony-aligned-rlm-runner-symbolic-collab-runtime-and-config-shell-extraction
title: Coordinator Symphony-Aligned RLM Runner Symbolic Collab Runtime And Config Shell Extraction
status: active
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-rlm-runner-symbolic-collab-runtime-and-config-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-rlm-runner-symbolic-collab-runtime-and-config-shell-extraction.md
related_tasks:
  - tasks/tasks-1238-coordinator-symphony-aligned-rlm-runner-symbolic-collab-runtime-and-config-shell-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first registration after `1237` extracted the runtime and collab shell into `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts` and local inspection plus scout evidence confirmed that `rlmRunner.ts` still owns duplicated symbolic collab-runtime invocation branches and shell-owned role-policy plus allow-default-role config wrappers. Evidence: `docs/findings/1238-rlm-runner-symbolic-collab-runtime-and-config-shell-extraction-deliberation.md`, `out/1237-coordinator-symphony-aligned-rlm-runner-codex-runtime-and-collab-lifecycle-shell-extraction/manual/20260316T092106Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The iterative and symbolic RLM cores remain extracted, and `1237` moved runtime Codex command resolution, completion and JSONL handling, feature-key negotiation, and collab lifecycle validation into `rlmCodexRuntimeShell.ts`. The remaining `rlmRunner.ts` surface still owns a smaller but concrete shell seam around symbolic collab-runtime invocation and config ownership.

## Requirements

1. Extract the remaining symbolic collab-runtime shell across:
   - `orchestrator/src/cli/rlmRunner.ts`
   - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
   - `orchestrator/tests/RlmCodexRuntimeShell.test.ts`
   - `orchestrator/tests/RlmRunnerCollabLifecycle.test.ts`
   - `orchestrator/tests/RlmRunnerMode.test.ts`
2. Move the duplicated collab-aware symbolic `runSubcall` and deliberation invocation behavior behind the runtime shell instead of leaving it inline in `rlmRunner.ts`.
3. Move the remaining canonical-vs-legacy role-policy and allow-default-role env wrapper logic behind the same shell boundary when it is shell-owned rather than top-level orchestration.
4. Rehome shell-owned focused tests to direct runtime-shell imports where that reduces `rlmRunner.__test__` to genuine top-level-owner behavior.
5. Keep the iterative and symbolic loop cores, top-level CLI and env parsing, mode selection, budgets, and alignment policy out of scope.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM regressions
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- docs-review approval or explicit override
- `npm run pack:smoke`

## Exit Conditions

- `go`: the duplicated symbolic collab-runtime invocation and shell-owned config surface move behind `rlmCodexRuntimeShell.ts` while focused RLM contracts stay green
- `no-go`: the attempted move blurs top-level orchestration ownership or regresses symbolic collab lifecycle behavior
