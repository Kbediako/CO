# Task Checklist - CO-346 skipped review prerequisite-stage truth

- Linear Issue: `CO-346` / `a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Task id: `linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Branch: `kb/co-346-review-skip-stage-truth-v2`

## Checklist
- [x] Rework reset completed: previous PR closed, old workpad deleted, fresh branch created from current `origin/main`.
- [x] PR feedback sweep completed before new implementation; accepted Codex review blockers are carried into this packet.
- [x] Parallelization decision recorded and same-issue child test lane launched.
- [x] Docs-first packet created before implementation edits.
- [ ] Implementation updates skipped-review wording and error artifact propagation. Evidence: `orchestrator/src/manager.ts`, `orchestrator/src/cli/adapters/CommandBuilder.ts`, `orchestrator/src/types.ts`.
- [ ] Focused tests cover guard-stage truth, true build fallback, non-stage status detail, allow-failure artifact fallback, and unrelated artifact fallback.
- [ ] Validation gates pass or record exact existing-baseline failures.
- [ ] Standalone review and explicit elegance review complete before review handoff.
- [ ] PR attached, automated feedback drain clean, and Linear moved to review state.
