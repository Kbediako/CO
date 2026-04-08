# Task Checklist - linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade

- Linear Issue: `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
- MCP Task ID: `linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade`
- Primary PRD: `docs/PRD-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`
- Task spec: `tasks/specs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad source were drafted or refreshed for `CO-111`. Evidence: `docs/PRD-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `docs/TECH_SPEC-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `docs/ACTION_PLAN-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `tasks/specs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `tasks/tasks-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `.agent/task/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`.
- [x] Docs-review delegation evidence is captured, or a truthful manual fallback is recorded if the wrapper stops on an existing repo baseline rather than a packet-shape defect. Evidence: `.runs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade-co-111-docs-review/cli/2026-04-08T14-57-15-059Z-f8f36b4d/manifest.json`, `out/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/TASKS-archive-2026.md`, `.runs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade-co-111-docs-review-final/cli/2026-04-08T14-58-11-681Z-dc4c1d9d/manifest.json`.

## Implementation
- [x] Deterministic merge closeout can reuse same-run cached issue-context evidence when live `issue-context` reads are cooldown-suppressed. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Rehydrated active `Merging` recovery no longer preserves `provider_issue_rehydrated_active_run` once attached PR snapshot truth already proves the lane is merged. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Ordinary open-PR `Merging` merge-shepherding lanes remain active and are not misclassified by the new recovery logic. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] The recovered cooldown-suppressed path persists explicit non-null `merge_closeout` truth and leaves the claim non-running. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.

## Validation
- [x] Focused regressions cover cached issue-context fallback and active-run merged recovery without regressing open-PR `Merging` behavior. Evidence: `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `TASK=linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade FORCE_CODEX_REVIEW=1 npm run review -- --manifest <manifest>`, and `npm run pack:smoke` all pass on the branch head or record a truthful existing-baseline fallback. Evidence: `out/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/manual/workpad.md`, `.runs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/cli/2026-04-08T14-39-14-621Z-1942f37e/manifest.json`, `/Users/kbediako/Code/CO/.runs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/cli/2026-04-08T14-39-14-621Z-1942f37e/review/telemetry.json`, `.runs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade-co-111-docs-review-final/cli/2026-04-08T14-58-11-681Z-dc4c1d9d/manifest.json`, `https://github.com/Kbediako/CO/pull/385`.
- [x] Local control-host truth proves the stale merged claim no longer remains active `Merging` solely because live Linear rereads are under cooldown. Evidence: `/Users/kbediako/Code/CO/.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-linear-audit.jsonl`, `/Users/kbediako/Code/CO/.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-proof.json`, `orchestrator/tests/ProviderMergeCloseout.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `6ad0b749-8c35-4907-bfcd-1922758ca903`, `out/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/manual/workpad.md`.
- [x] A PR is attached before any review-state handoff. Evidence: `https://github.com/Kbediako/CO/pull/385`.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
