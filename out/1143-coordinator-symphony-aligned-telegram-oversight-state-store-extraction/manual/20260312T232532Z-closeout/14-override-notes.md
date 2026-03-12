# Override Notes

- `docs-review` for the docs-first registration remains an explicit override from the registration phase. The first attempt failed at its own delegation guard, and the rerun drifted into `scripts/tasks-archive.mjs` after following archive-policy context instead of surfacing a concrete `1143` docs defect. Evidence: `../20260312T230956Z-docs-first/05-docs-review-override.md`.
- `diff-budget` required the standard stacked-branch override because this branch carries many previously approved Symphony-alignment slices. Evidence: `09-diff-budget.log`.

No additional closeout overrides were needed on the final `1143` tree.
