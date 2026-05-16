# Task Checklist - linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90

- Linear Issue: `CO-545` / `f43c6213-a14e-4c3f-ab51-2c539a4d2c90`
- MCP Task ID: `linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90`
- Primary PRD: `docs/PRD-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- TECH_SPEC: `tasks/specs/linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- .agent mirror: `.agent/task/linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`

## Docs-First
- [x] PRD drafted with user-request translation, protected terms, non-goals, Not Done If, and parity matrix. Evidence: `docs/PRD-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`.
- [x] TECH_SPEC drafted with stale cohort evidence and validation plan. Evidence: `tasks/specs/linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`, `docs/TECH_SPEC-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`.
- [x] ACTION_PLAN drafted with serial sequencing and rollback plan. Evidence: `docs/ACTION_PLAN-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`.
- [x] Checklist mirrored to .agent task file. Evidence: `.agent/task/linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Acceptance Criteria
- [x] Current owner packet exists for the May 16 Apr 14/15 strict `spec-guard` stale `last_review` baseline.
- [x] Every affected numbered stale row from 1182..1213 and 1219 is reviewed against its same-file completed checklist and reclassified inactive `done`.
- [x] Every affected UUID-backed `linear-*` stale row is reviewed against live Linear Done/completed state and reclassified inactive `done`.
- [x] No affected spec is deleted and `node scripts/spec-guard.mjs` is unchanged.
- [x] `node scripts/spec-guard.mjs` passes non-dry on the branch. Evidence: post-repair command returned `Spec guard: OK`.
- [ ] Workpad and PR notes preserve strict `spec-guard` versus `docs:freshness:maintain` distinction.
- [ ] Draft PR is linked to CO-545 with current validation evidence.

## Validation
- [x] Pre-repair strict spec-guard reproduction. Evidence: `MCP_RUNNER_TASK_ID=linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90 node scripts/spec-guard.mjs` reported the 51 Apr 14/15 rows.
- [x] Numbered-row evidence review. Evidence: same-file checklists for 1182..1213 and 1219 have zero unchecked items.
- [x] UUID-backed row evidence review. Evidence: live `node bin/codex-orchestrator.js linear issue-context --issue-id <uuid> --format json` verified Done/completed for CO-171 through CO-193 listed in the TECH_SPEC.
- [x] `node scripts/spec-guard.mjs`. Evidence: returned `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: returned `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: command ran and failed only on broader pre-existing CO-522-owned docs freshness debt; branch reported 286 stale docs versus 323 stale docs on clean `origin/main`, and `docs:freshness:maintain` classified the current owner as CO-522 with `block_policy_over_budget`.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed with explicit override reason for the declared 51-row stale cohort plus required docs-first mirrors.
- [x] `git diff --check`. Evidence: returned no output.
- [x] gpt-5.5/xhigh standalone review. Evidence: `codex review -c model="gpt-5.5" -c model_reasoning_effort="xhigh" --uncommitted --title "CO-545 strict spec-guard stale baseline"` reported no actionable correctness issues.
- [x] Explicit elegance/minimality pass. Evidence: manual pass found no smaller safe change than row-level reclassification plus the required owner packet/registry/index mirrors; no guard code, CO-544 files, or broad docs freshness cleanup were added.

## Progress Log
- 2026-05-16: Shared root verified clean current main at `4caee1d9f1b467f8e8ec63e2b54dec4e321310fd`; isolated worktree and branch created from `origin/main`.
- 2026-05-16: Created single CO-545 workpad and recorded `stay_serial` / `single_bounded_change` because packet, stale row decisions, registry mirrors, validation, and PR handoff share one evidence chain.
- 2026-05-16: Reproduced strict `spec-guard` failure before repo edits, reviewed all affected stale rows, and reclassified completed rows inactive `done` without deleting specs or changing guard code.
- 2026-05-16: Validation completed for strict `spec-guard`, docs check, whitespace, diff budget with explicit scope override, docs freshness classification, standalone review, and elegance/minimality.
