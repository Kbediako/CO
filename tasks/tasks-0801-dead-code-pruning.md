# Task 0801 — Dead Code Pruning & Evidence

- MCP Task ID: `0801-dead-code-pruning` (export before orchestrator commands so manifests land under `.runs/0801-dead-code-pruning/cli/`).
- Primary PRD: `docs/PRD-dead-code-pruning.md`
- Tech Spec: `docs/TECH_SPEC-dead-code-pruning.md`
- Run Manifest (first diagnostics/plan): _(pending)_ `.runs/0801-dead-code-pruning/cli/<run-id>/manifest.json`
- Metrics/State: _(pending)_ `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`

## Checklist
- [ ] Capture diagnostics/plan manifest referencing dead-code inventory (include knip/manual evidence).
- [ ] Update docs mirrors (PRD/TECH_SPEC/docs/TASKS/tasks/index.json) with manifest links.
- [ ] Finalize remediation plan: delete or archive each candidate with rationale recorded in manifest summary.
- [ ] Run guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (record results in manifest).
- [ ] Reviewer hand-off: `npm run review --manifest <latest>` once ready, citing manifest path and approvals.
