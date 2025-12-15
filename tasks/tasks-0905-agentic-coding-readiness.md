# Task 0905 — Agentic Coding Readiness & Onboarding Hygiene

- MCP Task ID: `0905-agentic-coding-readiness`
- Primary PRD: `docs/PRD-agentic-coding-readiness.md`
- Tech Spec: `docs/TECH_SPEC-agentic-coding-readiness.md`
- Action Plan: `docs/ACTION_PLAN-agentic-coding-readiness.md`
- Run Manifest (latest diagnostics/guardrails): `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- Metrics/State: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.

## Checklist
### Foundation
- [x] Capture diagnostics/guardrails manifest — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0905-agentic-coding-readiness.md`, and `tasks/index.json` — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.

### Onboarding docs
- [x] Replace `.agent/system/*` placeholders with repo-specific architecture/service/interface/conventions guidance — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Replace `.ai-dev-tasks/*` placeholders with the canonical PRD → tasks → execute loop (non-interactive safe) — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Remove stale/non-standard subagent docs and ensure guidance is Codex-first (`codex exec` / `codex review`), with no broken local links — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.

### CI guardrails
- [x] Enable GitHub Actions workflow(s) that run the core lane on PRs and pushes to main: `npm ci`, `npm run build`, `npm run lint`, `npm run test`, `node scripts/spec-guard.mjs` — Evidence: `.github/workflows/core-lane.yml`.
- [x] Ensure CI uses full git history (`fetch-depth: 0`) and sets `BASE_SHA` for PR diffs so spec-guard is meaningful — Evidence: `.github/workflows/core-lane.yml`.

### Guardrails
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
