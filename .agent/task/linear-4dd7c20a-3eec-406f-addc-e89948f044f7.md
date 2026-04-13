# Task Checklist - linear-4dd7c20a-3eec-406f-addc-e89948f044f7

- Linear Issue: `CO-149` / `4dd7c20a-3eec-406f-addc-e89948f044f7`
- MCP Task ID: `linear-4dd7c20a-3eec-406f-addc-e89948f044f7`
- Primary PRD: `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
- Task spec: `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and saved workpad source were drafted for `CO-149`. Evidence: `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/tasks-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `.agent/task/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes captured in the task spec before coding. Evidence: `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`.
- [x] Docs-review approval captured for this task, or a truthful fallback recorded if the child stream stops on an existing repo baseline. Evidence: `.runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7-co-149-docs-review/cli/2026-04-11T12-44-14-281Z-e269d6a8/manifest.json`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state `In Progress` before active coding. Evidence: packaged `linear transition` on `2026-04-11`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: `out/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/manual/workpad.md`, packaged `linear upsert-workpad`.
- [x] Exactly one explicit same-turn parallelization decision was recorded. Evidence: packaged `linear parallelization` recorded `stay_serial` / `single_bounded_change`.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the provider-worker workspace snapshot. Evidence: branch `linear/co-149-unreadable-foreign-provider-manifests` from `0159bdac1`.

## Investigation
- [x] The current admission gap is narrowed to unreadable-manifest occupancy under `providerIssueHandoff.ts`, not generic status-truth or worker supervision work. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`.
- [x] The packet now records the corrected policy seam: no local PID liveness for foreign worker-host proofs, no general discovered-run synthesis, and an explicit proof heartbeat TTL before counting proof-only unreadable occupancy. Evidence: `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`.

## Implementation
- [x] Admission-only unreadable foreign occupancy helper implemented in `providerIssueHandoff.ts` without reopening general discovery or ownership flows. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Focused `ProviderIssueHandoff` regressions cover direct/webhook, queued retry resume or start, and stale-history non-wedge behavior for unreadable foreign manifests. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] Focused unreadable-foreign admission tests pass. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t unreadable`, `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Standard validation floor runs before review handoff for a non-trivial diff. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`.
- [x] Standalone review and explicit elegance/minimality pass complete before handoff. Evidence: attempted `FORCE_CODEX_REVIEW=1 npm run review -- --manifest .runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/cli/2026-04-11T11-38-35-453Z-bf352bf9/manifest.json`; wrapper stalled without `review/telemetry.json`, so a manual correctness/regressions fallback plus explicit elegance cleanup were recorded in the saved workpad.

## Handoff
- [ ] Workpad refreshed after docs, implementation, validation, and immediately before review handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
