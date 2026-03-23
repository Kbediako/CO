# Task Checklist - 1320-coordinator-symphony-post-merge-retry-timer-follow-up

- MCP Task ID: `1320-coordinator-symphony-post-merge-retry-timer-follow-up`
- Primary PRD: `docs/PRD-coordinator-symphony-post-merge-retry-timer-follow-up.md`
- TECH_SPEC: `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-post-merge-retry-timer-follow-up.md`

## Docs-first
- [x] PRD drafted for the post-merge retry-timer follow-up lane. Evidence: `docs/PRD-coordinator-symphony-post-merge-retry-timer-follow-up.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`, `docs/TECH_SPEC-coordinator-symphony-post-merge-retry-timer-follow-up.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-coordinator-symphony-post-merge-retry-timer-follow-up.md`.
- [x] `tasks/index.json` registers the `1320` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1320` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`. Evidence: `.agent/task/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`.
- [x] docs-review approved the `1320` packet for implementation. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up/cli/2026-03-23T07-58-26-934Z-c67f0095/manifest.json`.

## Investigation
- [x] Post-merge GitHub Actions failure captured and classified. Evidence: `https://github.com/Kbediako/CO/actions/runs/23425656167/job/68139836805`, `/tmp/co-run-23425656167-job-68139836805.log`.
- [x] Local targeted reproduction attempted before code changes. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer"`, repeated stress pass `50/50`.
- [x] Current runtime/code-path audit completed for the retry queue and provider handoff seam. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerIssueRetryQueue.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Follow-up Linear issue created. Evidence: `CO-3`, `https://linear.app/asabeko/issue/CO-3/post-merge-core-lane-retry-timer-regression-in-providerissuehandoff`.

## Implementation
- [x] Stabilize the failing retry-timer test seam with the smallest correct patch. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts:4277`, `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] Keep production/runtime behavior unchanged unless a real reproduced bug requires otherwise. Evidence: runtime files untouched; read-only audit of `orchestrator/src/cli/control/providerIssueHandoff.ts` and `orchestrator/src/cli/control/providerIssueRetryQueue.ts`, plus review summary in `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/review/output.log`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up/cli/2026-03-23T07-58-26-934Z-c67f0095/manifest.json`, `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `npm run build`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `npm run lint`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `npm run test`. Evidence: parent local `npm run test` completed `290/290` files and `2220/2220` tests; `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`.
- [x] `npm run review`. Evidence: `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/manifest.json`, `.runs/1320-coordinator-symphony-post-merge-retry-timer-follow-up-review/cli/2026-03-23T08-06-01-178Z-d387935d/review/output.log`.
- [x] `npm run pack:smoke` not required because no downstream-facing CLI/package/skill surface changed. Evidence: diff limited to `orchestrator/tests/ProviderIssueHandoff.test.ts` plus docs/task files.

## Delivery
- [ ] Open PR for `1320`, handle feedback, and wait for required checks to reach terminal green.
- [ ] Merge, return local repo to clean `main`, and record final closeout evidence.
