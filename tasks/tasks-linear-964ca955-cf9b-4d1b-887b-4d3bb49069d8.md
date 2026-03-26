# Task Checklist - linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8

- Linear Issue: `CO-5` / `964ca955-cf9b-4d1b-887b-4d3bb49069d8`
- MCP Task ID: `linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8`
- Primary PRD: `docs/PRD-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`
- TECH_SPEC: `tasks/specs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`

## Docs-First
- [x] PRD drafted for the terminal workspace cleanup and attached-PR auto-close issue. Evidence: `docs/PRD-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`.
- [x] TECH_SPEC drafted with the Symphony parity baseline and actual CO cleanup seam. Evidence: `tasks/specs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`, `docs/TECH_SPEC-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, tests, and handoff. Evidence: `docs/ACTION_PLAN-linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`. Evidence: `.agent/task/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md`.
- [x] Standalone review approval captured in spec/checklist notes. Evidence: `tasks/specs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8.md` `review_notes`, `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T14-48-08-884Z-c36eacd1/manifest.json`.
- [x] docs-review approval captured for registered `linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T14-48-08-884Z-c36eacd1/manifest.json`.

## Implementation
- [x] `provider-linear-worker` config exposes terminal cleanup metadata through the effective provider workflow snapshot. Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/types.ts`.
- [x] Terminal provider release runs a cleanup hook before workspace deletion. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerTerminalCleanup.ts`, `orchestrator/src/cli/controlHostCliShell.ts`.
- [x] Attached GitHub PR auto-close is bounded to attached PR URLs from the same GitHub repository whose head branch and head commit match the workspace target, with a hard cleanup cap and command timeout. Evidence: `orchestrator/src/cli/control/providerTerminalCleanup.ts`, `orchestrator/tests/ProviderTerminalCleanup.test.ts`.
- [x] Cleanup failures are logged and surfaced without crashing terminal release handling. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Focused tests cover no attached PR, detached no-PR cleanup, already-closed PR, successful close, close-hook failure, repository mismatch, attachment-cap enforcement, and terminal cleanup integration. Evidence: `orchestrator/tests/ProviderTerminalCleanup.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `npx vitest run orchestrator/tests/ProviderTerminalCleanup.test.ts orchestrator/tests/ProviderWorkflowConfigStore.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`, rerun locally after the detached-HEAD and snapshot-fallback fixes.
- [x] `npm run build`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`, rerun locally after the detached-HEAD and snapshot-fallback fixes.
- [x] `npm run lint`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`, rerun locally after the detached-HEAD and snapshot-fallback fixes.
- [x] `npm run test`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`, final focused rerun `npx vitest run orchestrator/tests/ProviderTerminalCleanup.test.ts orchestrator/tests/ProviderWorkflowConfigStore.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts` passed with `3` files / `162` tests, and the final full local rerun `npm run test` passed with `296` files / `2455` tests.
- [x] `npm run docs:check`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`, rerun locally after the detached-HEAD and snapshot-fallback fixes.
- [x] `npm run docs:freshness`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8/cli/2026-03-26T15-09-56-550Z-5d0e351c/manifest.json`, rerun locally after the detached-HEAD and snapshot-fallback fixes.
- [x] `node scripts/diff-budget.mjs`. Evidence: `DIFF_BUDGET_OVERRIDE_REASON="docs-first packet plus bounded terminal-cleanup hook and focused regressions for CO-5" node scripts/diff-budget.mjs` accepted the final `1865 > 1200` override on the current diff.
- [x] `npm run review -- --manifest <latest-manifest> --non-interactive`. Evidence: manifest-backed review wrapper was attempted with diff-budget and large-scope overrides but stalled for more than 9 minutes without a verdict; manual correctness/elegance fallback completed on the current diff, and the subsequent PR feedback loop landed the remaining cleanup hardening: detached-HEAD PR matching, startup snapshot fallback, repository-identity matching, detached no-PR summary formatting, and bounded cleanup timeout/cap behavior.
- [x] `npm run pack:smoke`. Evidence: rerun locally after the final cleanup hardening and docs-evidence mirror updates; downstream pack smoke passed.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `64796287-ea69-41ed-ade7-cf4d78dc481a`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `https://github.com/Kbediako/CO/pull/305`.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: branch started from `origin/main` `49d888416`; pre-handoff merge still pending after implementation.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
