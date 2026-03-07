# 1054 Override Notes

- `docs-review` docs-first override:
  - The docs-first registration run passed `spec-guard`, `docs:check`, and `docs:freshness`, but the pipeline-local review wrapper drifted into the known low-signal evidence reinspection loop instead of returning a concrete docs finding.
  - Disposition: accepted as a docs-first review override because deterministic docs gates passed, and the later collab correctness plus elegance streams completed successfully.

- `diff-budget` override:
  - Local closeout used the known stacked-branch reasoning recorded in `08-diff-budget.log`.
  - The failure reflects branch accumulation against `origin/main`, not an attempt to widen `1054` beyond the bounded execution-helper seam.

- `npm run pack:smoke` not required:
  - `1054` touches only control-server/helper/test/doc/task-mirror paths under `orchestrator/src/cli/control/`, `orchestrator/tests/`, `docs/`, and task mirrors.
  - No downstream-facing CLI/package/skills/review-wrapper/npm surface changed in this slice.
