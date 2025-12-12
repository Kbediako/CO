# Task 0901 — Orchestrator Issue Validation & Prioritization

- MCP Task ID: `0901-orchestrator-issue-validation` (export before orchestrator commands so manifests land under `.runs/0901-orchestrator-issue-validation/cli/`).
- Primary PRD: `docs/PRD-orchestrator-issue-validation.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-issue-validation.md`
- Run Manifest (latest diagnostics/plan): `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics/State: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.

## Checklist
- [x] Capture diagnostics/plan manifest for task 0901 and mirror links in docs/tasks — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [ ] Validate issue #1 (sub‑pipeline error finalization) with a failing subpipeline repro.
- [ ] Validate issue #2 (CLI exec args passthrough) with a runtime repro or unit test.
- [ ] Validate issue #3 (session env override on reuse) with a persistent session repro.
- [ ] Validate issue #4 (retry config clobbering) via unit tests for both stores.
- [ ] Validate issue #5 (`isIsoDate` strictness) via unit tests and caller review.
- [ ] Validate issue #6 (instruction stamp hard‑fail) using a fixture repo.
- [ ] Validate issue #7 (SIGKILL timeout) on Windows or simulated platform test.
- [ ] Validate issue #8 (temp dir leakage) by repeated runs and filesystem audit.
- [ ] Validate issue #9 (eslint plugin side‑effect build) in clean/readonly lint run.
- [x] Update PRD/spec/docs/TASKS/tasks/index.json mirrors with evidence — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [ ] Produce follow‑up fix plan (new task/PR) with priorities and acceptance criteria.
