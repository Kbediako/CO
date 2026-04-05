# Task Checklist - linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7

- Linear Issue: `CO-80` / `7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
- MCP Task ID: `linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
- Primary PRD: `docs/PRD-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`
- TECH_SPEC: `tasks/specs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`

## Docs-First
- [x] PRD drafted for the `CO-80` deterministic merge-closeout lane. Evidence: `docs/PRD-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`.
- [x] TECH_SPEC drafted with the merge-closeout proof, arming, watchdog, and recovery contract. Evidence: `tasks/specs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`, `docs/TECH_SPEC-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs and task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`. Evidence: `.agent/task/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`.
- [x] Standalone pre-implementation self-review captured in the spec readiness gate. Evidence: `tasks/specs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7.md`.
- [x] docs-review approval captured for `linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7`. Evidence: `.runs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7-co-80-docs-review/cli/2026-04-04T15-45-52-765Z-8416294b/manifest.json`.

## Implementation
- [x] Add a first-class merge-closeout proof contract with explicit arming, attempt, result, shared-root reconciliation, and final Linear transition fields. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/src/cli/control/providerIntakeState.ts`.
- [x] Reuse or extract deterministic PR readiness truth for merge-closeout arming/watchdog decisions. Evidence: `scripts/lib/pr-watch-merge.js`, `scripts/lib/pr-watch-merge.d.ts`, `orchestrator/src/cli/control/providerMergeCloseout.ts`.
- [x] Add a bounded control-host/provider watchdog or relaunch path for clean merge-ready issues parked in `Merging`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Preserve explicit action-required outcomes when the PR is not safely merge-ready. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Keep existing shared-root closeout semantics from `CO-25` and wire them into the new artifact contract rather than relying on prompt inference. Evidence: `orchestrator/src/cli/control/providerMergeCloseout.ts`, `orchestrator/tests/ProviderMergeCloseout.test.ts`.

## Validation
- [x] Add focused regressions for merge-closeout proof state, restart/recovery relaunch, and explicit action-required outcomes. Evidence: `orchestrator/tests/ProviderMergeCloseout.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlServerStartupInputPreparation.test.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: local run on 2026-04-05 reported `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `npm run build`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `npm run lint`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] `npm run test`. Evidence: local run on 2026-04-05 reported `312` files and `2964` tests passed.
- [x] `npm run docs:check`. Evidence: local run on 2026-04-05 after the stale-review-date refresh.
- [x] `npm run docs:freshness`. Evidence: local run on 2026-04-05 after the stale-review-date refresh.
- [x] `node scripts/diff-budget.mjs`. Evidence: local run on 2026-04-05 after the review-driven fixes.
- [x] Manifest-backed standalone review wrapper executed and the rerun fallback was recorded truthfully. Evidence: `.runs/linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7/cli/2026-04-05T01-13-22-125Z-24a60b65/manifest.json`, Linear workpad comment `2283d72b-14d9-4964-b4b1-d4feabc775bc`.
- [x] Explicit elegance review recorded after review findings were addressed. Evidence: Linear workpad comment `2283d72b-14d9-4964-b4b1-d4feabc775bc`.
- [x] `npm run pack:smoke`. Evidence: local run on 2026-04-05 reported `pack smoke passed`.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear workpad comment `2283d72b-14d9-4964-b4b1-d4feabc775bc`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: merge commit `9fadab726`.
- [ ] All actionable review threads resolved or waiver recorded before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
