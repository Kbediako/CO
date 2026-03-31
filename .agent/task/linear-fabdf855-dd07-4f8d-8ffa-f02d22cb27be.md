# Task Checklist - linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be

- Linear Issue: `CO-56` / `fabdf855-dd07-4f8d-8ffa-f02d22cb27be`
- MCP Task ID: `linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be`
- Primary PRD: `docs/PRD-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`
- TECH_SPEC: `tasks/specs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`

## Docs-First
- [x] PRD drafted for the provider-worker delegated-manifest reconciliation lane. Evidence: `docs/PRD-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`.
- [x] TECH_SPEC drafted with the mixed-root provider-worker baseline and narrow fix path. Evidence: `tasks/specs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`, `docs/TECH_SPEC-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`. Evidence: `.agent/task/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md` `review_notes`.
- [x] docs-review approval captured for `linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be`. Evidence: `.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be-docs-review/cli/2026-03-31T08-23-01-823Z-0c86b6cb/manifest.json`, `.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be-docs-review/cli/2026-03-31T08-23-01-823Z-0c86b6cb/review/telemetry.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-56`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `bc82008f-b9f8-4e79-8aff-f7223dacb96a`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on the current checkout. Evidence: `linear/co-56-delegation-guard-workspace-evidence`.

## Investigation
- [x] The current mixed-root provider-worker env contract is explicit. Evidence: active env carries `CODEX_ORCHESTRATOR_ROOT=/Users/kbediako/Code/CO/.workspaces/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be` and `CODEX_ORCHESTRATOR_RUNS_DIR=/Users/kbediako/Code/CO/.runs`; the active manifest records `workspace_path=/Users/kbediako/Code/CO/.workspaces/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be`.
- [x] The current child helper behavior is explicit and already workspace-scoped. Evidence: `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/providerLinearChildLaneShell.ts`.
- [x] The narrow fix seam is defined before implementation. Evidence: `tasks/specs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`.

## Implementation
- [x] Reconcile top-level delegated-manifest discovery so provider-worker tasks search the audited workspace-scoped runs root in addition to the inherited shared root when appropriate. Evidence: `scripts/delegation-guard.mjs` now derives provider-worker workspace search roots from the active manifest/workspace contract and rejects foreign-workspace manifests.
- [x] Preserve fail-closed behavior when no delegated child manifest exists. Evidence: `tests/delegation-guard.spec.ts` covers both the workspace-root miss case and the foreign-workspace stale-manifest case.
- [x] Update provider-worker delegation guidance so valid child-stream / child-lane evidence is treated as the intended answer instead of override text. Evidence: `skills/linear/SKILL.md` and `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Add focused mixed-root regressions for the workspace-path success case and the fail-closed absence case. Evidence: `tests/delegation-guard.spec.ts` adds success, absence, and foreign-workspace regressions; `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` covers prompt guidance.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] Explicit elegance/minimality pass recorded after standalone review. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run pack:smoke` if downstream-facing CLI/package/skills surfaces change. Evidence: pending or not needed.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue remains `In Progress`.
