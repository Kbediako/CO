# Task Checklist - linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702

- Linear Issue: `CO-120` / `cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- MCP Task ID: `linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- Primary PRD: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- TECH_SPEC: `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`

## Docs
- [x] Docs packet recreated and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/TECH_SPEC-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/tasks-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `.agent/task/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`.
- [x] Fresh docs-review child-stream evidence recorded on the `r3` reset packet, and the actionable packet/code feedback was resolved before handoff. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r3b/cli/2026-04-10T15-45-44-565Z-4cf696ae/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r3c/cli/2026-04-10T15-53-39-501Z-d84c7389/manifest.json`, `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260410T160541Z-review-fallback.md`.
- [x] Exactly one persistent Linear workpad comment is current for this reset attempt. Evidence: `linear upsert-workpad --issue-id cc5c55d9-9145-4fa8-93d9-551a3fff7702 --body-file out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/workpad.md`.

## Investigation
- [x] Live Linear workflow states were rechecked in `Rework` before active coding. Evidence: `linear issue-context`.
- [x] Required same-turn parallelization decision recorded as `forbid_parallel` / `parent_only_mutation`. Evidence: `linear parallelization --decision forbid_parallel --reason parent_only_mutation`.
- [x] The stale PR `#416` was closed and the stale Linear workpad was deleted as part of the required rework reset. Evidence: `gh pr close 416`, `linear delete-workpad`.
- [x] The workspace was reset onto fresh branch `linear/co-120-worktree-git-identity-isolation-r3` from current `origin/main` before replaying the bounded fix. Evidence: `git switch -c linear/co-120-worktree-git-identity-isolation-r3 origin/main`.
- [x] Baseline audit confirmed the bounded seam: the CO-102 archive-sync session log and the checked-in archive automation workflow both use plain `git config user.*` inside linked worktrees, while the repo currently has no repo-owned `git config --worktree` identity path on `origin/main`. Evidence: `/Users/kbediako/.codex/sessions/2026/04/09/rollout-2026-04-09T08-32-53-019d6f3a-208e-7220-a6c7-2e2046309ec0.jsonl`, `.github/workflows/archive-automation-base.yml`.
- [x] Historical shared repo config still resolves author identity as `Codex <codex@openai.com>`, so this reset must use explicit per-command commit identity instead of mutating repo or global config. Evidence: `git config --show-origin --get-regexp '^user\\.'`, `git var GIT_AUTHOR_IDENT`.

## Implementation
- [x] Add a repo-owned helper that preserves global identity inheritance by default and uses `git config --worktree` for explicit alternate identity only. Evidence: `scripts/worktree-git-identity.mjs`.
- [x] Make the helper own the `extensions.worktreeConfig` precondition explicitly before any first `git config --worktree` identity write. Evidence: `scripts/worktree-git-identity.mjs`.
- [x] Fail closed on invalid/non-repo worktree paths during both the inherited-identity clear path and the explicit alternate-identity path while still treating "nothing to clear yet" as benign. Evidence: `scripts/worktree-git-identity.mjs`, `tests/worktree-git-identity.spec.ts`.
- [x] Switch the linked-worktree archive automation workflow to the safe helper path. Evidence: `.github/workflows/archive-automation-base.yml`.
- [x] Add focused regression coverage proving the shared repo git config file remains free of a repo-local `[user]` override after linked-worktree helper execution. Evidence: `tests/worktree-git-identity.spec.ts`.
- [x] Record the exact verification path that proves the cloud/Codex-upgrade hypothesis is not the root cause of this bug. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260411T0148Z-manual-verification.log`.

## Validation
- [x] Fresh `linear child-stream --pipeline docs-review` evidence recorded for the `r3` reset packet. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r3b/cli/2026-04-10T15-45-44-565Z-4cf696ae/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r3c/cli/2026-04-10T15-53-39-501Z-d84c7389/manifest.json`, `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260410T160541Z-review-fallback.md`.
- [x] Fresh `linear child-stream --pipeline implementation-gate` evidence recorded after the review-fix follow-up patch. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`).
- [x] Focused linked-worktree helper regression coverage in a temporary repo on the fresh `origin/main` base. Evidence: `npx vitest run tests/worktree-git-identity.spec.ts` (`10` tests passed on `2026-04-11` after adding existing non-repo directory coverage alongside the explicit invalid-worktree failure path).
- [x] Exact shared repo git-config before/after verification commands recorded and rerun locally, including the `extensions.worktreeConfig=true` helper path when explicit worktree-local identity is requested. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260411T0148Z-manual-verification.log`, direct invalid-worktree probe on `2026-04-11`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/01-delegation-guard.ndjson`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/02-spec-guard.ndjson`.
- [x] `npm run build`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/03-build.ndjson`.
- [x] `npm run lint`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/04-lint.ndjson`.
- [x] `npm run test`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/05-test.ndjson`.
- [x] `npm run docs:check`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/06-docs-check.ndjson`.
- [x] `npm run docs:freshness`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/07-docs-freshness.ndjson`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-implementation-gate-r3d/cli/2026-04-10T16-39-17-053Z-9ed164e7/commands/08-diff-budget.ndjson`.
- [x] Standalone review plus explicit elegance pass completed for the final diff before handoff. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260410T160541Z-review-fallback.md`, `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260410T160541Z-elegance-review.md`.

## Handoff
- [ ] Fresh PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver with evidence recorded before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
