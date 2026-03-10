# Override Notes - 1108

- `docs-review` override remains intentional for the docs-first registration bundle. Evidence: `../20260310T065400Z-docs-first/05-docs-review-override.md`.
- `diff-budget` ran with the explicit stacked-branch override reason `1108 is a narrow dirty-tree slice on a long-lived stacked branch; review should stay on the current files, not the cumulative branch diff.` Evidence: `08-diff-budget.log`.
- Final live audit-review override: the wrapper surfaced concrete `1108` findings twice and all of them were fixed in-tree, but the final rerun still broadened into repeated whole-file/state reinspection instead of returning a bounded terminal verdict on the review-state surface. This remains tracked review reliability work, not an unrecorded `1108` correctness failure. Evidence: `09-review.log`.
