# Task Checklist - linear-54387f04-30aa-436a-9901-690c0e9cfcee

- Linear Issue: `CO-114` / `54387f04-30aa-436a-9901-690c0e9cfcee`
- MCP Task ID: `linear-54387f04-30aa-436a-9901-690c0e9cfcee`
- Primary PRD: `docs/PRD-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`
- TECH_SPEC: `tasks/specs/linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`, `docs/TECH_SPEC-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`, `docs/ACTION_PLAN-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`, `tasks/specs/linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`, `tasks/tasks-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`, `.agent/task/linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`.
- [x] docs-review child-stream evidence recorded for the CO-114 packet. Evidence: `.runs/linear-54387f04-30aa-436a-9901-690c0e9cfcee-co-114-docs-review/cli/2026-04-09T04-29-36-631Z-60ef7624/manifest.json`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`, Linear comment `b0b01210-61ad-4c64-a724-1a1034c091f1`.

## Implementation
- [ ] Pure contract coverage moved in-process for the hot CLI and review-wrapper suites where a real subprocess is unnecessary.
- [ ] A bounded subprocess smoke matrix remains for true end-to-end CLI and review-wrapper confidence.
- [ ] Remaining subprocess coverage avoids unnecessary repeated `ts-node/esm` cold boot where a lighter harness preserves the same contract.
- [ ] The diff stays bounded to the hot suites, their direct harness seams, and the required docs/evidence paths.

## Validation
- [ ] Current focused timing baseline captured for `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`.
- [ ] After-change focused timing evidence captured for `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`.
- [ ] Full test-step proxy timing comparison recorded against the issue baseline.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Standalone review or truthful manual fallback recorded.
- [ ] Explicit elegance pass recorded.
- [ ] `npm run pack:smoke` if the final diff still touches downstream-facing CLI/review-wrapper surfaces.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
