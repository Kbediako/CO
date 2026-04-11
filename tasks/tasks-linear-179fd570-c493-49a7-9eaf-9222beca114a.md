# Task Checklist - linear-179fd570-c493-49a7-9eaf-9222beca114a

- Linear Issue: `CO-100` / `179fd570-c493-49a7-9eaf-9222beca114a`
- MCP Task ID: `linear-179fd570-c493-49a7-9eaf-9222beca114a`
- Primary PRD: `docs/PRD-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`
- TECH_SPEC: `tasks/specs/linear-179fd570-c493-49a7-9eaf-9222beca114a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`

## Docs-First
- [x] PRD drafted for the `CO-100` shared-root reconciliation and `Merging` recovery lane. Evidence: `docs/PRD-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`.
- [x] TECH_SPEC drafted with the merge-closeout, recovery-ordering, and operator-visibility contract. Evidence: `tasks/specs/linear-179fd570-c493-49a7-9eaf-9222beca114a.md`, `docs/TECH_SPEC-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs and task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-179fd570-c493-49a7-9eaf-9222beca114a.md`. Evidence: `.agent/task/linear-179fd570-c493-49a7-9eaf-9222beca114a.md`.
- [x] Standalone pre-implementation self-review captured in the spec readiness gate. Evidence: `tasks/specs/linear-179fd570-c493-49a7-9eaf-9222beca114a.md`.
- [x] docs-review approval captured for `linear-179fd570-c493-49a7-9eaf-9222beca114a`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-co-100-docs-review/cli/2026-04-05T23-17-53-200Z-ad53e4b9/manifest.json`.

## Implementation
- [x] Prevent `Merging` refresh/rehydrate from bypassing deterministic merge closeout through a preserved `provider_issue_rehydrated_active_run`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable7/cli/2026-04-06T02-15-22-819Z-037c2529/manifest.json`.
- [x] Make merged closeout record durable pending shared-root reconciliation truth when sync is skipped for safety. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`, `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable5/cli/2026-04-06T01-09-24-350Z-d304f583/manifest.json`.
- [x] Project shared-root reconciliation status and exact reason into the authoritative operator-facing observability surface. Evidence: `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/operatorDashboardPresenter.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`.
- [x] Preserve automatic fast-forward of `/Users/kbediako/Code/CO` to `origin/main` when the shared root is exact clean `main`. Evidence: existing fast-forward path retained in `orchestrator/src/cli/control/providerMergeCloseout.ts` and covered by `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Preserve existing fail-closed skip/failure behavior for unsafe shared-root mutation. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`.

## Validation
- [x] Add focused regressions for merged shared-root skip visibility and resumed-active-run `Merging` bypass recovery. Evidence: `orchestrator/tests/ProviderMergeCloseout.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json` (dry-run completed; stale unrelated repo-wide specs remain outside CO-100 scope).
- [x] `npm run build`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json`, plus local rerun on the final presenter diff.
- [x] `npm run lint`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json`, plus local rerun on the final presenter diff.
- [x] `npm run test`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json` (`313` files, `3043` tests) and local final rerun (`315` files, `3047` tests).
- [x] `npm run docs:check`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json` with `DIFF_BUDGET_OVERRIDE_REASON`.
- [x] Manifest-backed standalone review wrapper executed truthfully. Evidence: `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable7/cli/2026-04-06T02-15-22-819Z-037c2529/manifest.json` (`review_outcome: clean-success` on the pre-follow-up diff), plus `.runs/linear-179fd570-c493-49a7-9eaf-9222beca114a-stable8/cli/2026-04-06T02-36-50-981Z-756c3dd6/manifest.json` and `review/output.log` showing the forced wrapper ran on the refreshed diff before stalling and triggering the recorded manual fallback review.
- [x] Explicit elegance review recorded after review findings were addressed. Evidence: recorded in `out/linear-179fd570-c493-49a7-9eaf-9222beca114a/manual/workpad.md` and the Linear workpad comment.
- [x] `npm run pack:smoke`. Evidence: `out/linear-179fd570-c493-49a7-9eaf-9222beca114a/manual/pack-smoke.log`.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear workpad comment `0264e157-7269-49cb-ba84-2ee0090bfba7` (`https://linear.app/asabeko/issue/CO-100/co-make-shared-root-reconciliation-deterministic-after-merged-closeout#comment-0264e157`).
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] All actionable review threads resolved or waiver recorded before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
