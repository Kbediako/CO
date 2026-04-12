# Task Checklist - linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d

- Linear Issue: `CO-162` / `8c691f55-5277-443a-b5dd-1f3f548b1b6d`
- MCP Task ID: `linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d`
- Primary PRD: `docs/PRD-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`
- TECH_SPEC: `tasks/specs/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`

## Docs-First
- [x] PRD drafted for the startup recovery-sweep request-burn lane. Evidence: `docs/PRD-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`.
- [x] TECH_SPEC drafted with the narrow startup caller and released-claim fail-closed seam. Evidence: `tasks/specs/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`, `docs/TECH_SPEC-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, regressions, restart proof, and handoff. Evidence: `docs/ACTION_PLAN-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot while preserving the line budget through one archive rotation. Evidence: `docs/TASKS.md`, `docs/TASKS-archive-2026.md`.
- [x] Checklist mirrored to `.agent/task/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`. Evidence: `.agent/task/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`, `tasks/tasks-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`.
- [x] Audited docs-review evidence or explicit fallback captured for `linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d`. Evidence: `out/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d/manual/docs-review-fallback.md`, `.runs/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d-co-162-docs-review/cli/2026-04-12T13-04-34-718Z-4be838bd/review/telemetry.json`.

## Implementation
- [x] Make startup recovery-sweep polls fail closed for retained released inactive and non-mutable claims without direct issue-by-id reads. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Preserve recovery-sweep handling of runnable tracked issues returned by the sweep. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts` (`fails closed for retained released inactive and non-mutable claims during startup recovery sweeps while still reopening sweep-returned work`).
- [x] Preserve deferred-poll no-burn behavior from `CO-160`, startup accepted pending-revalidation live revalidation, explicit non-deferred reopen behavior, and active-run recovery. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts` (`fails closed for retained released inactive and non-mutable claims during deferred polls without direct reads or fresh discovery churn`, `revalidates pending accepted claims during startup recovery sweeps even when released-only fail-closed is enabled`, `still reopens a retained released not-mutable claim on a non-deferred poll when live evidence restores mutability`, explicit restart rehydrate coverage in the same file).

## Validation
- [x] Focused regressions distinguish deferred poll, startup recovery sweep, non-deferred explicit reopen, and active-run recovery. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ControlServerPublicLifecycle.test.ts` (`285` tests passed).
- [x] Guarded restart proof shows no new `dispatch_source_issue_by_id` entries after the first startup recovery sweep. Evidence: `out/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d/manual/20260412T1328Z-isolated-startup-proof/01-proof-summary.md`, `out/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d/manual/20260412T1328Z-isolated-startup-proof/04-isolated-post-start-budget-summary.json`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `npm run build`. Evidence: successful local build on `2026-04-12`.
- [x] `npm run lint`. Evidence: passed on `2026-04-12`.
- [x] `npm run test`. Evidence: passed on `2026-04-12` (`333` files, `3643` tests).
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 3695 docs, 3698 registry entries`.
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 4680 tracked files, 0 action-required`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=5/25, lines=125/1200, +107/-18)`.
- [x] `npm run review`. Evidence: `.runs/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d/cli/2026-04-12T12-51-39-738Z-f5711f40/review/telemetry.json` (`review_outcome: failed-boundary`, `termination_boundary.kind=command-intent`) plus refreshed manual fallback in `out/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d/manual/standalone-review.md`. Waiver decision: accepted for this lane because the repeated failure remained a bounded review-wrapper command-intent violation rather than a code finding, the manual fallback review inspected the current follow-up head directly and found no actionable regressions, and all other required validation gates remained green.
- [x] `npm run pack:smoke`. Evidence: passed on `2026-04-12`.

## Handoff
- [x] Workpad refreshed with docs-review evidence, implementation scope, validation truth, review fallback, and elegance result before handoff. Evidence: `out/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d/manual/workpad.md`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `https://github.com/Kbediako/CO/pull/453`, Linear attachment `a3316f77-d20b-41aa-acfc-8ee158eced8b`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main` plus `git merge --no-edit origin/main` -> `Already up to date.`
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review` or `Human Review`) only after coding stops. Evidence: pending.
