# Task Checklist - CO-346 skipped review prerequisite-stage truth

- Linear Issue: `CO-346` / `a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Task id: `linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Branch: `kb/co-346-review-skip-stage-truth`

## Checklist
- [x] Queue, blocker, PR readiness, and bug-discovery subagents completed read-only validation. Evidence: parent orchestration transcript.
- [x] CO-346 moved into `CO Control and Advisory`, set In Progress, and labelled for implementation.
- [x] Docs-first packet created before implementation edits.
- [x] Implementation updates skipped-review wording and error artifact propagation. Evidence: `orchestrator/src/manager.ts`, `orchestrator/src/cli/adapters/CommandBuilder.ts`.
- [x] Focused tests cover guard-stage skip and true build skip. Evidence: `npm run test -- orchestrator/tests/TaskManager.test.ts orchestrator/tests/CommandBuilder.test.ts`.
- [x] Validation gates pass or record exact existing-baseline failures. Evidence: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint` (0 errors, 3 pre-existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`), `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`; delegation guard used an override because hook-level `spawn_agent` evidence is not emitted as CO child-lane manifests.
- [x] Standalone review completed without findings. Evidence: `.runs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f/cli/2026-04-24T06-49-48-915Z-9e41f13d/review/telemetry.json`.
- [ ] PR merged and Linear issue moved to Done.
