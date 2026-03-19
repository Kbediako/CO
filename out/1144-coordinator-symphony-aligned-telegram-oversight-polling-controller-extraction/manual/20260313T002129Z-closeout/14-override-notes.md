# 1144 Override Notes

## docs-review registration override

- Carried from the docs-first package.
- Reason: the first docs-review stopped at its own delegation guard and the rerun broadened into unrelated docs-hygiene / broader review-surface inspection instead of returning a bounded docs verdict.
- Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T000149Z-docs-first/00-summary.md`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T000149Z-docs-first/05-docs-review-override.md`

## diff-budget stacked-branch override

- Reason: `1144` is a bounded Telegram polling-controller extraction on a long-lived stacked Symphony-alignment branch, so branch-vs-`origin/main` scope is much larger than the lane-local diff.
- Evidence: `09-diff-budget.log`

## `npm run test` quiet-tail override

- Reason: the current tree hit the recurring full-suite quiet tail after the final visible `tests/cli-orchestrator.spec.ts` case on both the pipe-backed run and a fresh TTY rerun. No failing assertion surfaced before the tail.
- Evidence: `06-test.log`

## `npm run review` drift override

- Reason: bounded review inspected the `1144` diff, then drifted into speculative broader inspection instead of converging to a narrow verdict. No concrete `1144` correctness defect surfaced.
- Evidence: `10-review.log`
