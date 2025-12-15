# Task 0905 — Agentic Coding Readiness & Onboarding Hygiene

- MCP Task ID: `0905-agentic-coding-readiness`
- Primary PRD: `docs/PRD-agentic-coding-readiness.md`
- Tech Spec: `docs/TECH_SPEC-agentic-coding-readiness.md`
- Action Plan: `docs/ACTION_PLAN-agentic-coding-readiness.md`
- Run Manifest (diagnostics): _(pending — capture first diagnostics run under `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`)._

## Checklist
### Foundation
- [ ] Capture diagnostics/guardrails manifest — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] Metrics/state snapshots updated — Evidence: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- [ ] Mirrors updated in `docs/TASKS.md`, `.agent/task/0905-agentic-coding-readiness.md`, and `tasks/index.json` — Evidence: this commit + manifest link once captured.

### Onboarding docs
- [ ] Replace `.agent/system/*` placeholders with repo-specific architecture/service/interface/conventions guidance.
- [ ] Replace `.ai-dev-tasks/*` placeholders with the canonical PRD → tasks → execute loop (non-interactive safe).
- [ ] Remove stale/non-standard subagent docs and ensure guidance is Codex-first (`codex exec` / `codex review`), with no broken local links.

### CI guardrails
- [ ] Enable GitHub Actions workflow(s) that run the core lane on PRs and pushes to main: `npm ci`, `npm run build`, `npm run lint`, `npm run test`, `node scripts/spec-guard.mjs`.
- [ ] Ensure CI uses full git history (`fetch-depth: 0`) and sets `BASE_SHA` for PR diffs so spec-guard is meaningful.

### Guardrails
- [ ] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] `npm run build` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] `npm run lint` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] `npm run test` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
