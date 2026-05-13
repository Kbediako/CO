# Task Checklist - linear-0af906c6-1f6c-461b-88f7-da67656bcf1b

- Linear Issue: `CO-118` / `0af906c6-1f6c-461b-88f7-da67656bcf1b`
- MCP Task ID: `linear-0af906c6-1f6c-461b-88f7-da67656bcf1b`
- Primary PRD: `docs/PRD-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- TECH_SPEC: `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `docs/TECH_SPEC-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `docs/ACTION_PLAN-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `tasks/tasks-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `.agent/task/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`.
- [x] docs-review child-stream evidence recorded and spec ambiguity resolved before implementation. Evidence: `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b-co-118-docs-review-final/cli/2026-04-09T08-51-33-692Z-295bd5e6/manifest.json` for the original findings, `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b-co-118-docs-review-r2/cli/2026-04-09T09-04-17-041Z-fb44e299/manifest.json` for the corrected rerun (`spec-guard`, `docs:check`, and `docs:freshness` succeeded; forced standalone review failed as `review_outcome=failed-other` because the reviewer model was at capacity), and the same-turn manual docs review recorded in `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `https://linear.app/asabeko/issue/CO-118/co-add-operator-autopilot-so-queue-shepherding-can-run-outside-a#comment-a234a38c`, `out/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b/manual/workpad.md`.

## Investigation
- [x] Live Linear workflow states were rechecked and the issue was moved from `Ready` to `In Progress` before active coding. Evidence: `linear issue-context`, `linear transition --state "In Progress"`.
- [x] Required same-turn parallelization decision recorded as `stay_serial` / `overlapping_scope`. Evidence: `linear parallelization --decision stay_serial --reason overlapping_scope`.
- [x] The detached workspace was moved onto branch `linear/co-118-operator-autopilot` before repo edits. Evidence: `git switch -c linear/co-118-operator-autopilot`.
- [x] Baseline audit confirmed the bounded remaining seam: current code already covers fresh dispatch, review-to-`Merging`, and deterministic `Merging` closeout, but not backlog promotion, review-to-`Rework`, or explicit pending local rollout actions. Evidence: `linearDispatchSource.ts`, `providerLinearWorkflowStates.ts`, `providerIssueHandoff.ts`, `providerMergeCloseout.ts`.

## Implementation
- [x] Add a dedicated operator-autopilot control module plus repo-tracked workflow metadata. Evidence: `orchestrator/src/cli/control/providerOperatorAutopilot.ts`, `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `codex.orchestrator.json`.
- [x] Reuse the existing dispatch order and blocker truth for safe backlog-head promotion. Evidence: `orchestrator/src/cli/control/providerOperatorAutopilot.ts`, `orchestrator/tests/ProviderOperatorAutopilot.test.ts`.
- [x] Reuse existing review-promotion truth to transition actionable review handoffs into `Rework` without sending `REVIEW_REQUIRED` there. Evidence: `orchestrator/src/cli/control/providerOperatorAutopilot.ts`, `orchestrator/tests/ProviderOperatorAutopilot.test.ts`.
- [x] Surface the latest operator-autopilot result and append durable audit records for actions and holds. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Surface pending local rollout actions after merge-closeout truth lands. Evidence: `orchestrator/src/cli/control/providerOperatorAutopilot.ts`, `orchestrator/tests/ProviderOperatorAutopilot.test.ts`.
- [x] Add focused regressions for queue, rework, and pending-action behavior. Evidence: `orchestrator/tests/ProviderOperatorAutopilot.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-0af906c6-1f6c-461b-88f7-da67656bcf1b node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-118-docs-review --format json`, followed by corrected rerun `--stream co-118-docs-review-r2 --format json` and a manual docs-review fallback when forced standalone review failed with reviewer-capacity `review_outcome=failed-other`.
- [x] Focused regression coverage for operator-autopilot queue and review-handoff behavior. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ProviderWorkflowConfigStore.test.ts` (`221` tests passed).
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (4 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `npm run build`. Evidence: `tsc -p tsconfig.build.json` exited `0`.
- [x] `npm run lint`. Evidence: `eslint ...` exited `0`.
- [x] `npm run test`. Evidence: default full suite passed on the current head (`324` files / `3285` tests / `113.87s`).
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `npm run docs:freshness` or a truthful repo-baseline fallback note. Evidence: `docs:freshness OK - 3464 docs, 3467 registry entries`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `DIFF_BUDGET_OVERRIDE_REASON='CO-118 review-follow-up spans required runtime hardening, queue-order regression coverage, and mirrored task-packet truth sync on top of the original autopilot slice.' node scripts/diff-budget.mjs` passed (`files=5/25`, `lines=368/1200`).
- [x] Manifest-backed standalone review plus explicit elegance review before any review handoff. Evidence: `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b/cli/2026-04-09T08-32-59-802Z-ea2c90b7/review/telemetry.json` recorded `status=failed`, `review_outcome=failed-boundary`, `termination_boundary.kind=command-intent`; manual correctness/regressions review plus manual elegance/minimality fallback completed against the same diff and found no additional blocking issues.
- [x] `npm run pack:smoke` if the final diff touches downstream-facing CLI/runtime surfaces. Evidence: `✅ pack smoke passed`.

## Handoff
- [x] PR attached to the issue. Evidence: `https://github.com/Kbediako/CO/pull/398`, attached via the packaged `linear attach-pr` helper.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
