# ACTION_PLAN - Reconcile Shared Local Checkout to origin/main After Autonomous Merge Closeout

## Added by Bootstrap 2026-03-28

## Traceability
- Linear issue: `CO-25` / `156d7133-00ba-40be-bd35-67cd3ae46e21`
- Linear URL: https://linear.app/asabeko/issue/CO-25/co-reconcile-shared-local-checkout-to-originmain-after-autonomous

## Summary
- Goal: finish `CO-25` by adding an explicit, safe shared-root reconciliation step to autonomous merged closeout so the same workpad says whether `/Users/kbediako/Code/CO` was aligned or intentionally skipped, and so the contract refreshes the local shared-root `origin/main` ref before `merge --ff-only origin/main`.
- Scope: docs-first packet refresh for the live rework finding, pre-implementation docs-review, provider-worker prompt updates, repo-local `linear` / `land` skill updates, focused prompt-contract tests, required validation, and workpad refresh.
- Assumptions:
  - the missing seam is still the provider-worker closeout contract, not a deeper control-host workspace-management gap
  - safe root mutation remains limited to fast-forward-only sync on clean `main`
  - live closeout proved `git fetch origin main` was too weak because it left the local shared-root `origin/main` ref stale in this repo
  - delegation-guard steps in this run require explicit override evidence because subagent spawning is unavailable in-session

## Milestones & Sequencing
1) Register the docs-first packet for `linear-156d7133-00ba-40be-bd35-67cd3ae46e21`, update `tasks/index.json`, update `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, and mirror the checklist to `.agent/task/`.
2) Run docs-review for the new packet and capture the explicit override/evidence needed for this provider-worker run.
3) Refresh the docs packet with the live rework finding: merged closeout must update the local shared-root `origin/main` ref before `merge --ff-only origin/main`.
4) Update `orchestrator/src/cli/providerLinearWorkerRunner.ts` so first-turn and continuation prompts require shared-root inspection, tracking-ref refresh, safe fast-forward-only sync, and explicit skip-reason evidence before `Done`.
5) Update `skills/linear/SKILL.md` and `skills/land/SKILL.md` so merged closeout guidance matches the new shared-root reconciliation contract.
6) Update focused prompt/contract tests in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
7) Run the required validation floor, refresh the workpad with current evidence, and prepare the branch for PR/review handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `skills/linear/SKILL.md`
- `skills/land/SKILL.md`
- `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-156d7133-00ba-40be-bd35-67cd3ae46e21`
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the prompt/skill contract changes if the wording proves ambiguous or widens beyond the safe shared-root sync requirement
  - keep the issue in an active state until merged closeout truthfully records either aligned root state or explicit skip reason

## Risks & Mitigations
- Risk: the lane widens into generic root-checkout automation.
  - Mitigation: keep the contract specific to merged provider-worker closeout and the shared root checkout only.
- Risk: the worker interprets root sync too aggressively and mutates unsafe local state.
  - Mitigation: require explicit `main` + clean checks, fast-forward-only sync, and skip-on-unsafe wording in both prompts and skills.
- Risk: the worker refreshes `FETCH_HEAD` but still merges against a stale local `origin/main`.
  - Mitigation: require an explicit remote-tracking-ref refresh command in both prompts and skills, then lock it with prompt/skill regressions.
- Risk: workpad evidence remains vague and not machine-checkable.
  - Mitigation: require before/after `git status --short --branch` (or equivalent) in the same closeout comment.

## Approvals
- Reviewer: standalone self-review approved after current workflow and git-state audit
- Date: 2026-03-28
