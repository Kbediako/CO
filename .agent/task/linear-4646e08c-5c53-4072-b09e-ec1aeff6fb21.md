# Task Checklist - linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21

- Linear Issue: `CO-31` / `4646e08c-5c53-4072-b09e-ec1aeff6fb21`
- MCP Task ID: `linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21`
- Primary PRD: `docs/PRD-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`
- TECH_SPEC: `tasks/specs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`

## Docs-First
- [x] PRD drafted for the repeated post-merge `Core Lane` failure lane. Evidence: `docs/PRD-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`.
- [x] TECH_SPEC drafted with the failing run evidence, bounded repair path, and closeout classification contract. Evidence: `tasks/specs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`, `docs/TECH_SPEC-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`.
- [x] ACTION_PLAN drafted for docs-review, reproduction, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new task packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`. Evidence: `.agent/task/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md`.
- [x] Standalone pre-implementation review approval captured in spec notes. Evidence: `tasks/specs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21.md` `review_notes`.
- [x] docs-review approval captured for `linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-20-51-476Z-b169d281/manifest.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition` succeeded with explicit workspace/team/project scope IDs and `issue-context` now reports state `In Progress`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created and updated comment `71d7292d-9968-4d0e-a2fd-f5a8377df342`, and `issue-context` now reports that comment as the active workpad.

## Implementation
- [x] Repeated post-merge failure shape reproduced or otherwise root-caused with artifact-backed evidence. Evidence: `out/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/manual/root-cause-evidence.md`.
- [x] Smallest responsible fix landed for the proven seam. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Focused regressions added or updated for the exact failing provider and CLI seams. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Closeout classifies the root cause as CO-24 regression, preexisting instability, or mixed shared-lane timing problem. Evidence: `out/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/manual/root-cause-evidence.md` classifies the outcome as a mixed shared-lane timing problem rather than a reproduced runtime regression.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 node scripts/delegation-guard.mjs`. Evidence: terminal output `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 node scripts/spec-guard.mjs --dry-run`. Evidence: terminal output `✅ Spec guard: OK`.
- [x] Focused reproduction and regression commands for `ProviderIssueHandoff` and `cli-command-surface`. Evidence: `out/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/manual/root-cause-evidence.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run build`. Evidence: command exited `0`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run lint`. Evidence: command exited `0`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run test`. Evidence: final-diff rerun passed `299` files / `2568` tests in `248.76s`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run docs:check`. Evidence: terminal output `✅ docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run docs:freshness`. Evidence: terminal output `docs:freshness OK - 3016 docs, 3026 registry entries`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 node scripts/diff-budget.mjs`. Evidence: terminal output `✅ Diff budget: OK (scope=working-tree, files=9/25, lines=371/1200, +361/-10)`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run review`. Evidence: final clean standalone review output at `/Users/kbediako/Code/CO/.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-08-12-918Z-060f9d7e/review/output.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: not required; the working diff is limited to docs plus test-only paths and does not modify downstream runtime/package entrypoints.

## Handoff
- [x] PR attached to the Linear issue before review-state transition. Evidence: PR `#315` / `https://github.com/Kbediako/CO/pull/315` is attached on the issue as attachment `0b8b3520-0eab-4ac1-a1a1-825d003ce820`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: explicit `git fetch origin refs/heads/main:refs/remotes/origin/main` refreshed `origin/main`, and both local `HEAD` and refreshed `origin/main` were `b81084ed121a59ca98f2b522ca1b5b602ceb54e8` before the fix commits were published.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending; issue is now `In Progress` with PR `#315` attached and the workpad current while required PR checks finish.
