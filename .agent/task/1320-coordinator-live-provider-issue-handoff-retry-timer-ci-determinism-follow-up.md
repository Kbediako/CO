# Task Checklist - 1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up

- MCP Task ID: `1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up`
- Primary PRD: `docs/PRD-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`
- TECH_SPEC: `tasks/specs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`

## Docs-first
- [x] PRD drafted for the post-merge retry-timer regression follow-up. Evidence: `docs/PRD-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`, `docs/TECH_SPEC-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`.
- [x] `tasks/index.json` registers the `1320` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1320` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`. Evidence: `.agent/task/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`.
- [x] docs-review approved the `1320` packet for implementation. Evidence: `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/manifest.json`.
- [x] Delegation override recorded up front because this provider-worker run cannot spawn subagents under the current session tool policy. Evidence: `docs/PRD-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`, `docs/TECH_SPEC-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`, `tasks/specs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md`.

## Investigation
- [x] Live Linear issue/team workflow state inspected before any transition. Evidence: `node dist/bin/codex-orchestrator.js linear issue-context --issue-id 902af7c9-9c23-4805-a652-5280723334d7`.
- [x] Post-merge Core Lane failure captured from GitHub Actions. Evidence: `gh run view 23425656167 --repo Kbediako/CO --json headSha,headBranch,conclusion,status,name,event,jobs`, `gh run view 23425656167 --repo Kbediako/CO --job 68139836805 --log-failed`.
- [x] Current retry-timer test and runtime seam inspected locally. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/src/cli/control/providerIssueRetryQueue.ts`.
- [x] Focused current-head reproduction/classification completed. Evidence: `CI=1 npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer"`, repeated `100/100` `CI=1` passes on 2026-03-23.

## Implementation
- [x] Minimal deterministic fix landed for the retry-timer seam. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderIssueRetryQueue.test.ts`.
- [x] Runtime behavior preserved because no real retry-owner bug was reproduced locally. Evidence: `CI=1` targeted single-pass plus `100/100` repeated pre-fix reproduction on 2026-03-23, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderIssueRetryQueue.test.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run cannot spawn subagents because spawn_agent is disallowed without explicit user request in this session." node scripts/delegation-guard.mjs`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint`.
- [x] `CI=1 env -i HOME="$HOME" PATH="$PATH" SHELL="$SHELL" TERM="${TERM:-xterm-256color}" npm run test`.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness`.
- [x] `node scripts/diff-budget.mjs`.
- [x] review completed with no findings. Evidence: `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/review/output.log`.
- [x] `npm run pack:smoke` not required because the diff is limited to docs plus test-only coverage changes; no downstream-facing CLI/package/skills/review-wrapper surface changed.
- [x] Explicit elegance/minimality pass completed; the split between the handoff integration boundary and the retry-queue unit replacement assertion is the smallest safe shape for this fix.

## Handoff
- [ ] Linear workpad refreshed to match the current implementation and risks.
- [ ] PR attached to the Linear issue before review handoff.
- [ ] Latest `origin/main` merged into the branch before review handoff.
- [ ] PR checks green before review handoff.
