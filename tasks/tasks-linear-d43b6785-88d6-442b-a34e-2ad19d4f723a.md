# Task Checklist - linear-d43b6785-88d6-442b-a34e-2ad19d4f723a

- Linear Issue: `CO-124` / `d43b6785-88d6-442b-a34e-2ad19d4f723a`
- MCP Task ID: `linear-d43b6785-88d6-442b-a34e-2ad19d4f723a`
- Primary PRD: `docs/PRD-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`
- TECH_SPEC: `tasks/specs/linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`

## Docs-First
- [x] PRD created for the repo-wide stewardship contract scope. Evidence: `docs/PRD-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`.
- [x] TECH_SPEC created for the tracked-file audit, catalog, workflow, and follow-up split plan. Evidence: `tasks/specs/linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`, `docs/TECH_SPEC-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`.
- [x] ACTION_PLAN created for the docs-first, implementation, and validation sequence. Evidence: `docs/ACTION_PLAN-linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`.
- [x] `tasks/index.json` refreshed for the new packet. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` refreshed with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` refreshed for the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`. Evidence: `.agent/task/linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-d43b6785-88d6-442b-a34e-2ad19d4f723a.md` `review_notes`.
- [ ] docs-review approval captured for the new packet scope. Evidence: pending.

## Workflow
- [x] `linear issue-context` inspected live team workflow states before transition work. Evidence: packaged `linear issue-context --issue-id d43b6785-88d6-442b-a34e-2ad19d4f723a` on 2026-04-09.
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded on 2026-04-09.
- [x] Exactly one same-turn parallelization decision was recorded. Evidence: packaged `linear parallelization --decision stay_serial --reason single_bounded_change` on 2026-04-09.
- [x] Workspace moved from detached `HEAD` onto a task branch based on current `main`. Evidence: `linear/co-124-repo-stewardship-audit`.
- [x] No PR was attached at bootstrap, so no PR feedback sweep was required before implementation. Evidence: packaged `linear issue-context` returned `attachments: []`.
- [ ] Exactly one persistent `## Codex Workpad` comment is current for this attempt. Evidence: pending refreshed workpad comment.

## Investigation
- [x] Current markdown-only upkeep boundary captured before code edits. Evidence: `scripts/lib/docs-helpers.js`, `scripts/docs-freshness.mjs`.
- [x] Current weekly automation boundary captured before code edits. Evidence: `.github/workflows/docs-truthfulness-weekly.yml`.
- [x] Current docs catalog scope captured before code edits. Evidence: `docs/docs-catalog.json`.
- [x] Initial historical residue candidates outside the markdown-only roots identified. Evidence: tracked files under `reference/**` and `archives/**`.
- [ ] Any larger out-of-scope residue cluster is split into a same-project follow-up instead of silently expanding scope. Evidence: pending only if needed after the audit run.

## Implementation
- [ ] Audited docs-review child stream captured before implementation continues. Evidence: pending.
- [ ] Repo stewardship catalog added with explicit coverage for front-door docs, code, scripts, configs, tasks, skills, tests, fixtures, references, archives, and assets. Evidence: pending.
- [ ] `npm run repo:stewardship` added and emits machine-checkable per-surface decisions. Evidence: pending.
- [ ] Focused regression coverage added for the new audit contract and bounded heuristics. Evidence: pending.
- [ ] Weekly automation expanded from docs-only drift into repo stewardship artifacts. Evidence: pending.
- [ ] Reviewable stewardship output captured, and any broader historical residue is linked to a follow-up issue instead of folded into this diff. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --format json`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run repo:stewardship`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] Explicit elegance review recorded before any review handoff. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run pack:smoke`. Evidence: pending.

## Handoff
- [ ] Workpad refreshed after docs-first, after implementation, and before the current stop point. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Unresolved actionable review threads are `0`, or a waiver is recorded with evidence before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: Linear state is `In Progress`.
