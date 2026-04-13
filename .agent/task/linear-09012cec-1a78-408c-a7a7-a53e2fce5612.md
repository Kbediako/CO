# Task Checklist - linear-09012cec-1a78-408c-a7a7-a53e2fce5612

- Linear Issue: `CO-165` / `09012cec-1a78-408c-a7a7-a53e2fce5612`
- MCP Task ID: `linear-09012cec-1a78-408c-a7a7-a53e2fce5612`
- Primary PRD: `docs/PRD-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`
- Task spec: `tasks/specs/linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the saved workpad source were drafted for `CO-165`. Evidence: `docs/PRD-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`, `docs/TECH_SPEC-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`, `docs/ACTION_PLAN-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`, `tasks/specs/linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`, `tasks/tasks-linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`, `.agent/task/linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-09012cec-1a78-408c-a7a7-a53e2fce5612/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the task spec before coding. Evidence: `tasks/specs/linear-09012cec-1a78-408c-a7a7-a53e2fce5612.md`.
- [ ] Docs-review approval is captured for this task.

## Workflow
- [ ] Live issue state was rechecked before active work; the issue was moved from `Ready` to the team’s started state before active coding.
- [ ] Exactly one explicit same-turn parallelization decision was recorded.
- [x] The workspace switched from `main` to branch `linear/co-165-provider-worker-full-suite-blockers`. Evidence: `git switch -c linear/co-165-provider-worker-full-suite-blockers`.
- [ ] Exactly one persistent `## Codex Workpad` comment is kept current on the issue.
- [ ] At least one audited child stream or child lane evidence artifact is captured for this attempt.

## Investigation
- [ ] Reproduce `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts` with exact command/evidence.
- [ ] Reproduce `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` with exact command/evidence.
- [ ] Classify whether the current missing-brace syntax regression in `orchestrator/src/cli/control/providerIssueHandoff.ts` is part of the live blocker seam or unrelated local residue.

## Implementation
- [ ] Land the smallest correct provider-worker fix or truthful non-repro closeout path without reopening CO-164 control-host cleanup behavior.
- [ ] Keep provider-worker workpad and handoff notes explicit about local current-tree breakage versus the issue’s named blocker surfaces.

## Validation
- [ ] Focused reproductions and any final fix-validation pass are recorded with exact commands.
- [ ] `npm run test` reaches a clean terminal result, or a scoped/auditable narrower blocker explanation is documented and validated.
- [ ] Standard validation floor runs for the final non-trivial diff.
- [ ] Standalone review and explicit elegance/minimality pass complete before handoff.

## Handoff
- [ ] Workpad refreshed after docs, reproduction, implementation, and immediately before any review or merge handoff.
- [ ] PR attached to the Linear issue before review-state transition if code lands.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops.
