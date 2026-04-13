# Task Checklist - linear-b0aac010-12ec-4509-88a4-c2dbc6395e19

- Linear Issue: `CO-137` / `b0aac010-12ec-4509-88a4-c2dbc6395e19`
- MCP Task ID: `linear-b0aac010-12ec-4509-88a4-c2dbc6395e19`
- Primary PRD: `docs/PRD-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`
- Task spec: `tasks/specs/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and saved workpad source were drafted for `CO-137`. Evidence: `docs/PRD-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`, `docs/TECH_SPEC-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`, `docs/ACTION_PLAN-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`, `tasks/specs/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`, `tasks/tasks-linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`, `.agent/task/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes captured in the task spec before coding. Evidence: `tasks/specs/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19.md`.
- [ ] Docs-review approval captured for this task, or a truthful fallback recorded if the child stream stops on an existing repo baseline. Evidence: pending.

## Workflow
- [x] Issue moved from `Ready` to the live started state `In Progress` before active coding. Evidence: packaged `linear transition` on `2026-04-11`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: `out/linear-b0aac010-12ec-4509-88a4-c2dbc6395e19/manual/workpad.md`, packaged `linear upsert-workpad`.
- [x] Exactly one explicit same-turn parallelization decision was recorded. Evidence: packaged `linear parallelization` recorded `parallelize_now` / `independent_scope_available`.
- [x] Workspace moved from detached `HEAD` onto a task branch. Evidence: branch `co-137-audit-review-launch-compat-seams`.
- [ ] At least one same-issue child lane completed successfully and was accepted, rejected, or invalidated explicitly. Evidence: pending.

## Investigation
- [ ] Current-consumer evidence for `review-launch-attempt` is captured and a keep/delete decision is explicit. Evidence: pending.
- [ ] Current-consumer evidence for the legacy collab env aliases is captured and a keep/delete decision is explicit. Evidence: pending.
- [ ] Current-consumer evidence for `orchestrator/src/sync/**` is captured and a keep/delete decision is explicit. Evidence: pending.
- [ ] Current-consumer evidence for the `requiresCloud` alias family is captured and a keep/delete decision is explicit. Evidence: pending.

## Implementation
- [ ] Any required truthfulness updates land in code comments or repo-facing docs for retained seams. Evidence: pending.
- [ ] Any narrowed or deleted seam changes remain bounded to the audited surfaces and their focused tests. Evidence: pending.

## Validation
- [ ] Focused seam tests pass for every changed audit surface. Evidence: pending.
- [ ] Standard validation floor runs before review handoff for the final non-trivial diff. Evidence: pending.
- [ ] Standalone review and explicit elegance/minimality pass complete before handoff. Evidence: pending.

## Handoff
- [ ] Workpad refreshed after docs, implementation, validation, and immediately before review handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
