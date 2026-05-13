# Task Checklist - linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8

- Linear Issue: `CO-85` / `8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`
- MCP Task ID: `linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`
- Primary PRD: `docs/PRD-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`
- TECH_SPEC: `tasks/specs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`

## Docs-First
- [x] PRD drafted for the current-head CodeRabbit issue-comment completion lane. Evidence: `docs/PRD-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`.
- [x] TECH_SPEC drafted with the narrow rereview-signal contract and validation plan. Evidence: `tasks/specs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`, `docs/TECH_SPEC-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`.
- [x] ACTION_PLAN drafted for docs review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`. Evidence: `.agent/task/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md` `review_notes`.
- [x] docs-review approval captured for `linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`, with the unrelated docs/spec baseline failure recorded explicitly. Evidence: `.runs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8-co-85-docs-review/cli/2026-04-05T01-20-27-806Z-8e94d0e8/manifest.json`, `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012027Z-docs-review-fallback.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded on 2026-04-05.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-85-ready-review-coderabbit-issue-comment`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear workpad comment `a7dd092c-13ce-40c6-8d00-cb3012ba5dcf` (`https://linear.app/asabeko/issue/CO-85/co-fix-ready-review-false-block-on-current-head-coderabbit-issue#comment-a7dd092c`).

## Investigation
- [x] Existing rereview-signal seam inspected before implementation. Evidence: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`.
- [x] Actual source PR CodeRabbit issue-comment completion evidence captured or transcribed into the packet. Evidence: `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012726Z-source-pr-362-coderabbit-issue-comment.md`.
- [x] Deterministic local reproduction of the false `bot_rereview_pending=[coderabbitai]` state captured. Evidence: `tests/pr-watch-merge.spec.ts`, `npx vitest run tests/pr-watch-merge.spec.ts`.

## Implementation
- [x] The watcher recognizes the intended current-cycle CodeRabbit issue-comment completion signal. Evidence: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`.
- [x] The fix preserves stale/pending blocking behavior. Evidence: `tests/pr-watch-merge.spec.ts`, `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012726Z-source-pr-362-coderabbit-issue-comment.md`.
- [x] Root cause and final fix are documented for future provider-worker lanes. Evidence: `tasks/specs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`, `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012027Z-docs-review-fallback.md`, `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012726Z-source-pr-362-coderabbit-issue-comment.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-85-docs-review --format json`. Evidence: `.runs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8-co-85-docs-review/cli/2026-04-05T01-20-27-806Z-8e94d0e8/manifest.json`, `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012027Z-docs-review-fallback.md`.
- [x] Focused watcher regression tests or equivalent proof recorded for the repaired seam. Evidence: `npx vitest run tests/pr-watch-merge.spec.ts`.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 node scripts/delegation-guard.mjs`. Evidence: command passed with `1 subagent manifest(s) found`.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 node scripts/spec-guard.mjs --dry-run`. Evidence: command completed, but reported unrelated stale specs `0996` through `1008` at 31 days old outside the CO-85 change surface.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 npm run build`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 npm run lint`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 npm run test`. Evidence: passed after the known long-tail reporter messages from `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 npm run docs:check`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 npm run docs:freshness`. Evidence: command ran to terminal status and failed only on unrelated stale docs baseline debt (`.agent/task/0102-slimdown-cycle-2.md`, `.agent/task/0105-rlm-orchestrator.md`, `docs/{PRD,TECH_SPEC,ACTION_PLAN}-slimdown-cycle-2.md`, `tasks/specs/0105-rlm-orchestrator.md`, `tasks/tasks-{0102,0105}*.md`); tracked separately in follow-up `CO-86`.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 node scripts/diff-budget.mjs`. Evidence: passed (`files=9/25`, `lines=544/1200`, `+537/-7`).
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: wrapper telemetry recorded `status=failed`, `review_outcome=failed-boundary`, `termination_boundary.kind=startup-anchor`; manual fallback review is recorded in `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T014324Z-standalone-review-fallback.md`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T014400Z-elegance-review.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8 npm run pack:smoke` because `scripts/lib/pr-watch-merge.js` is downstream-facing CLI behavior. Evidence: passed.

## Handoff
- [x] Workpad refreshed after docs, after implementation, and before the current stop point. Evidence: Linear workpad comment `a7dd092c-13ce-40c6-8d00-cb3012ba5dcf`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: draft PR `#363` / `https://github.com/Kbediako/CO/pull/363`, Linear attachment `511c800f-8d04-4461-9f65-455215331ea7`.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green, the draft blocker is intentionally cleared, and actionable review feedback is handled or explicitly pushed back before review-state transition. Evidence: current `ready-review` samples show `bot_rereview_pending=[-]`, `unresolved_threads=0`, and `blocked_by=draft, required_checks_pending=1` with `Core Lane` still running on PR `#363`.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: Linear state remains `In Progress`.
