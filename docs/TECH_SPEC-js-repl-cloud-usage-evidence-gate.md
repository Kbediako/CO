# TECH_SPEC - JS_REPL + Cloud Usage Evidence Gate

- Canonical TECH_SPEC: `tasks/specs/0990-js-repl-cloud-usage-evidence-gate.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-02.

## Archive Status
- Historical packet only. Codex CLI 0.128.0 removed `js_repl`, so this technical spec is not current implementation or guidance authority for `js_repl`.
- Preserve the original requirements and artifact references for audit context; do not treat the matrix below as an active gate for enabling or recommending `js_repl`.

## CO-382 Fallback Metadata
- Large-refactor check: no large refactor is required because CO-452 removes the stale `js_repl` active posture instead of adding another compatibility layer.
- Minor-seam check: the bounded minor-seam removal is acceptable because generic cloud feature pass-through remains intact while only removed-feature guidance and canary affordances are retired.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js_repl` active posture guidance | default-on, break-glass, and cloud feature-contract guidance for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-03 | 2026-05-01 | immediate removal | current-facing docs no longer recommend `js_repl` enable/disable or cloud feature toggles | `rg`, docs checks, focused cloud feature tests |
| scripts/js-repl-usage-matrix.mjs | active canary matrix for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-02 | 2026-05-01 | immediate removal | package script and source checkout no longer expose the `js_repl` canary as current guidance | package script audit and focused cloud feature tests |

## Summary
- Historical objective: execute a broad local+cloud dummy-repo evidence matrix before making any `js_repl` usage-policy recommendation, then align global guidance docs to the verified behavior. This objective no longer describes current work because `js_repl` has been removed.

## Historical Requirements
- Run local runtime matrix (`default`, `appserver`, `forced fallback`, `unsupported combo`) with threshold assertions.
- Run cloud required and cloud fallback contracts with feature-toggle coverage for `js_repl` enabled/disabled.
- Capture feature-flag propagation evidence from cloud command artifacts.
- Produce a matrix summary with explicit recommendation outcome (`adopt`, `defer`, `hold`).
- Apply minimal global guidance updates across agent/docs surfaces in this repo.

## Historical Acceptance
- Simulation artifacts and summary exist under `out/0990-js-repl-cloud-usage-evidence-gate/manual/`.
- Checklist mirrors and `tasks/index.json` are synchronized with `last_review` updated.
- Historical guidance changes explicitly documented runtime/cloud compatibility and the then-current `js_repl` policy state; current guidance must reflect removal in Codex CLI 0.128.0.

## Historical Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0990-js-repl-cloud-usage-evidence-gate.md`
  - `.agent/task/0990-js-repl-cloud-usage-evidence-gate.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation logs:
  - `out/0990-js-repl-cloud-usage-evidence-gate/manual/`
