# Task Checklist - linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277

- Linear Issue: `CO-45` / `3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`
- MCP Task ID: `linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`
- Primary PRD: `docs/PRD-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`
- TECH_SPEC: `tasks/specs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`

## Docs-First
- [x] PRD drafted for the autonomy-facing issue-intent hardening lane. Evidence: `docs/PRD-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`.
- [x] TECH_SPEC drafted with the safeguard split across tooling, templates, review gate, and checklist surfaces. Evidence: `tasks/specs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`, `docs/TECH_SPEC-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`. Evidence: `.agent/task/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md` `review_notes`.
- [x] docs-review approval captured for `linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`. Evidence: `.runs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277-co-45-docs-review/cli/2026-03-31T05-38-11-020Z-51bac25e/manifest.json`, `.runs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277-co-45-docs-review/cli/2026-03-31T05-38-11-020Z-51bac25e/review/telemetry.json`, `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T165600Z-docs-review-fallback.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-45`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `6ba118dd-1c44-4d54-ab88-017c4cac3b34`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on the current checkout. Evidence: `linear/co-45-intent-capture-hardening`.

## Investigation
- [x] The `CO STATUS` drift chain is documented concretely across `CO-7`, `CO-26`, and `CO-44`. Evidence: `docs/PRD-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`, `tasks/specs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`.
- [x] The current helper/template gaps are explicit and bounded. Evidence: `tasks/specs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md` `review_notes`.
- [x] The safeguard split is defined before implementation. Evidence: `docs/TECH_SPEC-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`.

## Implementation
- [x] Follow-up issue helper hardening landed with deterministic traceability and the stronger issue-shaping contract. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/linearCliShell.ts`, `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T180500Z-follow-up-description-combined.md`.
- [x] Docs-first templates and workflow guidance now preserve protected terms, parity matrices, `Not Done If`, and issue-quality review expectations. Evidence: `AGENTS.md`, `docs/AGENTS.md`, `docs/micro-task-path.md`, `.agent/task/templates/prd-template.md`, `.agent/task/templates/tech-spec-template.md`, `.agent/task/templates/action-plan-template.md`, `.agent/task/templates/tasks-template.md`.
- [x] Provider-worker prompt/help text matches the stronger follow-up issue contract. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `bin/codex-orchestrator.ts`, `skills/linear/SKILL.md`.
- [x] Focused regressions cover the new helper/CLI behavior. Evidence: `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node scripts/delegation-guard.mjs`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run build`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run lint`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run test`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run docs:check`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run docs:freshness`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node scripts/diff-budget.mjs`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-standalone-review-fallback.md`, `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-validation-summary.md`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T062742Z-elegance-review.md`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue remains `In Progress`.
