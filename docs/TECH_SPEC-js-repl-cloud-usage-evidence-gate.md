# TECH_SPEC - JS_REPL + Cloud Usage Evidence Gate

- Canonical TECH_SPEC: `tasks/specs/0990-js-repl-cloud-usage-evidence-gate.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-02.

## Summary
- Execute a broad local+cloud dummy-repo evidence matrix before making any `js_repl` usage-policy recommendation, then align global guidance docs to the verified behavior.

## Requirements
- Run local runtime matrix (`default`, `appserver`, `forced fallback`, `unsupported combo`) with threshold assertions.
- Run cloud required and cloud fallback contracts with feature-toggle coverage for `js_repl` enabled/disabled.
- Capture feature-flag propagation evidence from cloud command artifacts.
- Produce a matrix summary with explicit recommendation outcome (`adopt`, `defer`, `hold`).
- Apply minimal global guidance updates across agent/docs surfaces in this repo.

## Acceptance
- Simulation artifacts and summary exist under `out/0990-js-repl-cloud-usage-evidence-gate/manual/`.
- Checklist mirrors and `tasks/index.json` are synchronized with `last_review` updated.
- Guidance changes explicitly document runtime/cloud compatibility and current `js_repl` policy state.

## Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0990-js-repl-cloud-usage-evidence-gate.md`
  - `.agent/task/0990-js-repl-cloud-usage-evidence-gate.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation logs:
  - `out/0990-js-repl-cloud-usage-evidence-gate/manual/`
