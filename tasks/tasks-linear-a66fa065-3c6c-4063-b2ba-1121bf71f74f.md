# Task Checklist - CO-346 skipped review prerequisite-stage truth

- Linear Issue: `CO-346` / `a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Task id: `linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Branch: `kb/co-346-review-skip-stage-truth-v2`

## Checklist
- [x] Rework reset completed: previous PR closed, old workpad deleted, fresh branch created from current `origin/main`.
- [x] PR feedback sweep completed before new implementation; accepted Codex review blockers are carried into this packet.
- [x] Parallelization decision recorded and same-issue child test lane launched.
- [x] Docs-first packet created before implementation edits.
- [x] Implementation updates skipped-review wording and error artifact propagation. Evidence: `orchestrator/src/manager.ts`, `orchestrator/src/cli/adapters/CommandBuilder.ts`, `orchestrator/src/types.ts`.
- [x] Focused tests cover guard-stage truth, cloud target-stage truth with matching failed-command evidence, true build fallback, non-stage status detail, allow-failure artifact fallback, unrelated artifact fallback, and review feedback hardening for non-error stage artifacts. Evidence: `npm run test -- orchestrator/tests/CommandBuilder.test.ts orchestrator/tests/TaskManager.test.ts`.
- [x] Current-main Core Lane time-sensitive `ProviderIssueHandoff.test.ts` fixture is pinned to a deterministic test clock without changing runtime behavior. Evidence: `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "blocks direct webhook admission when queued retry and resumable claims fill max_allowed"`.
- [x] Validation gates pass. Evidence: `MCP_RUNNER_TASK_ID=linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Standalone review and explicit elegance review complete before review handoff. Evidence: `.runs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f/cli/2026-04-24T09-43-00-650Z-90a71ad8/review/telemetry.json` reported `review_outcome=bounded-success`, and parent manual elegance review found no simplification patch.
- [ ] PR attached, automated feedback drain clean, and Linear moved to review state.
