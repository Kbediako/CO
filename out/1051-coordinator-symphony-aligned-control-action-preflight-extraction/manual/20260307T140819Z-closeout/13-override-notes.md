# 1051 Override Notes

- `docs-review` docs-first override:
  - Attempted run: `.runs/1051/cli/2026-03-07T13-53-37-857Z-091494b4/manifest.json`
  - Result: failed during the pre-review delegation guard before semantic review executed because the run used bare numeric task id `1051`, while the current delegation guard normalizes top-level tasks to the canonical slug key `1051-coordinator-symphony-aligned-control-action-preflight-extraction`.
  - Disposition: accepted as a docs-first tooling/contract override; deterministic docs guards passed, and subordinate manifest-backed delegation evidence was later added via `1051-coordinator-symphony-aligned-control-action-preflight-extraction-guard`.

- `diff-budget` override:
  - Local closeout used `DIFF_BUDGET_OVERRIDE_REASON="stacked branch scope; 1051 delta remains bounded to control-action preflight extraction"`.
  - The delegated `1051-...-guard` implementation-gate run otherwise passed through `docs:freshness` and failed only at `diff-budget`, which matches the known stacked-branch pressure rather than a slice-specific defect.

- `npm run review` status:
  - The first local review attempt stopped at the wrapper diff-budget gate before Codex review started.
  - A second run with the stacked-branch override did reach Codex review and surfaced one real docs mismatch: the `1051` ACTION_PLAN incorrectly said response writing moved into the helper.
  - That docs mismatch was fixed in `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-preflight-extraction.md`.
  - A final rerun after the docs fix drifted back into low-signal reinspection of the helper, route, and tests without surfacing any new concrete `1051` defect, so it was terminated and recorded as an honest standalone-review override rather than treated as a clean pass.

- `npm run pack:smoke` not required:
  - `1051` touches only control-server/helper/test/doc paths under `orchestrator/src/cli/control/`, `orchestrator/tests/`, `docs/`, and task mirrors.
  - No CLI/package/skills/review-wrapper/downstream-facing npm surface changed in this slice.
