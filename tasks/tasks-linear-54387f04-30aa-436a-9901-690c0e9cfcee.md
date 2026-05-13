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
- [x] Pure contract coverage moved in-process for the hot CLI and review-wrapper suites where a real subprocess is unnecessary. Evidence: `bin/codex-orchestrator.ts`, `scripts/run-review.ts`, `tests/helpers/inProcessEntrypoint.ts`, `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`.
- [x] A bounded subprocess smoke matrix remains for true end-to-end CLI and review-wrapper confidence. Evidence: retained `runCliSubprocess(...)` smoke coverage in `tests/cli-command-surface.spec.ts` and retained `runReviewCommandSubprocess(...)` smoke coverage in `tests/run-review.spec.ts`.
- [x] Remaining subprocess coverage avoids unnecessary repeated `ts-node/esm` cold boot where a lighter harness preserves the same contract. Evidence: `shouldUseFreshDist(...)` selectors in `tests/cli-command-surface.spec.ts` and `tests/run-review.spec.ts`.
- [x] The diff stays bounded to the hot suites, their direct harness seams, and the required docs/evidence paths. Evidence: `bin/codex-orchestrator.ts`, `scripts/run-review.ts`, `tests/helpers/inProcessEntrypoint.ts`, `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, and the CO-114 docs packet.

## Validation
- [x] Current focused timing baseline captured for `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/20260409T045446Z-hot-suite-timings/summary.md`.
- [x] After-change focused timing evidence captured for `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/20260409T045446Z-hot-suite-timings/summary.md`.
- [x] Full test-step proxy timing comparison recorded against the issue baseline. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/20260409T045446Z-hot-suite-timings/summary.md`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `npm run build`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `npm run lint`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `npm run test`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `npm run docs:check`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.
- [x] Standalone review or truthful manual fallback recorded. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/20260409T060954Z-review-fallback.md`.
- [x] Explicit elegance pass recorded. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/20260409T060954Z-elegance-review.md`.
- [x] `npm run pack:smoke` if the final diff still touches downstream-facing CLI/review-wrapper surfaces. Evidence: `out/linear-54387f04-30aa-436a-9901-690c0e9cfcee/manual/workpad.md`.

## Handoff
- [x] PR attached to the issue. Evidence: `https://github.com/Kbediako/CO/pull/388`, Linear attachment `1b8d1af7-c990-432b-8f11-ff2f2542afbc`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: commit `323d63a56`.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
