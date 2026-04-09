# Task Checklist - linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702

- Linear Issue: `CO-120` / `cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- MCP Task ID: `linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- Primary PRD: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- TECH_SPEC: `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/TECH_SPEC-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/tasks-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `.agent/task/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`.
- [x] docs-review child-stream evidence recorded, and the surfaced packet-shape feedback was resolved before code changes. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-rerun/cli/2026-04-09T08-46-05-901Z-e6964d2e/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-approval-rerun/cli/2026-04-09T08-59-49-479Z-b1d984dc/manifest.json`, `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`; approval rerun accepted via manual fallback after its review step stalled post-`docs:check` / `docs:freshness`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `linear upsert-workpad` comment `af85ef4e-97fb-4eca-af05-3f8f17152255` on `CO-120`.

## Investigation
- [x] Live Linear workflow states were rechecked and the issue was moved from `Ready` to `In Progress` before active coding. Evidence: `linear issue-context`, `linear transition --state "In Progress"`.
- [x] Required same-turn parallelization decision recorded as `stay_serial` / `single_bounded_change`. Evidence: `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] The detached workspace was moved onto branch `linear/co-120-worktree-git-identity-isolation` before repo edits. Evidence: `git switch -c linear/co-120-worktree-git-identity-isolation`.
- [x] Baseline audit confirmed the bounded seam: the CO-102 archive-sync session log and the checked-in archive automation workflow both use plain `git config user.*` inside linked worktrees, while the repo currently has no `git config --worktree` identity path. Evidence: `/Users/kbediako/.codex/sessions/2026/04/09/rollout-2026-04-09T08-32-53-019d6f3a-208e-7220-a6c7-2e2046309ec0.jsonl`, `.github/workflows/archive-automation-base.yml`.
- [x] The issue workspace was resynced onto the latest `origin/main` before final blocker classification because it started `0` ahead / `11` behind the remote mainline. Evidence: `git rev-list --left-right --count HEAD...origin/main`, `git merge --ff-only origin/main`.

## Implementation
- [x] Add a repo-owned helper that preserves global identity inheritance by default and uses `git config --worktree` for explicit alternate identity only. Evidence: `scripts/worktree-git-identity.mjs`.
- [x] Make the helper own the `extensions.worktreeConfig` precondition explicitly before any first `git config --worktree` identity write. Evidence: `scripts/worktree-git-identity.mjs`, `tests/worktree-git-identity.spec.ts`.
- [x] Switch the linked-worktree archive automation workflow to the safe helper path. Evidence: `.github/workflows/archive-automation-base.yml`.
- [x] Add focused regression coverage proving the shared repo git config file remains free of a repo-local `[user]` override after linked-worktree helper execution. Evidence: `tests/worktree-git-identity.spec.ts`.
- [x] Record the exact verification path that proves the cloud/Codex-upgrade hypothesis is not the root cause of this bug. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/workpad.md`, `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-120-docs-review --format json` or truthful fallback evidence. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-rerun/cli/2026-04-09T08-46-05-901Z-e6964d2e/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-approval-rerun/cli/2026-04-09T08-59-49-479Z-b1d984dc/manifest.json`.
- [x] Focused linked-worktree helper regression coverage in a temporary repo, rerun on the synced `origin/main` base. Evidence: `npx vitest run --config vitest.config.core.ts tests/worktree-git-identity.spec.ts`.
- [x] Exact shared repo git-config before/after verification commands recorded and rerun locally, including any one-time `extensions.worktreeConfig=true` setup step. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/workpad.md`.
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [ ] `npm run test` remains blocked outside the CO-120 change surface on the synced `origin/main` base: the run failed in `orchestrator/tests/ControlRuntime.test.ts` and `orchestrator/tests/ProviderIssueHandoff.test.ts`, then exited under signal `143` while later suites were still active. A focused rerun also shows `tests/cli-frontend-test.spec.ts > sanitizes ambient provider config env in the real frontend-test CLI` timing out on the same base. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260409T101149Z-full-suite-after-origin-main/01-npm-run-test.log`, `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260409T100332Z-full-suite-patience/03-cli-frontend-test.log`; follow-up `CO-130`.
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `node scripts/diff-budget.mjs`
- [x] Manual standalone review plus explicit elegance pass completed in the worker lane: one parser missing-value edge case was found and fixed, and the final diff stayed at one helper, one workflow callsite change, and one focused spec. Evidence: `scripts/worktree-git-identity.mjs`, `.github/workflows/archive-automation-base.yml`, `tests/worktree-git-identity.spec.ts`.

## Handoff
- [ ] PR attached to the issue.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git merge --ff-only origin/main`.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition. Current blocker: unrelated current-main validation failures tracked in `CO-130`.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
