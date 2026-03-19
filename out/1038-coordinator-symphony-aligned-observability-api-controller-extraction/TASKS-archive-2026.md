# Task Archive — 2026

- Generated: 2026-03-07T05:07:02.628Z
- Source: docs/TASKS.md on main
- Policy: docs/tasks-archive-policy.json
# Task List Snapshot — Release README + Notes Follow-ups (0949-release-readme-followups)
- **Update — 2026-01-13:** Docs-review complete via `.runs/0949-release-readme-followups/cli/2026-01-13T02-26-19-647Z-2684eb72/manifest.json`; implementation-gate via `.runs/0949-release-readme-followups/cli/2026-01-13T02-26-54-969Z-dd0727c2/manifest.json`; subagent diagnostics via `.runs/0949-release-readme-followups-subagent/cli/2026-01-13T02-22-59-108Z-9d9cde36/manifest.json`. Notes: export `MCP_RUNNER_TASK_ID=0949-release-readme-followups`; guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Checklist mirror: `tasks/tasks-0949-release-readme-followups.md`, `.agent/task/0949-release-readme-followups.md`.
- [x] Foundation: subagent + docs-review + mirrors + docs registry updates. Evidence: `.runs/0949-release-readme-followups-subagent/cli/2026-01-13T02-22-59-108Z-9d9cde36/manifest.json`, `.runs/0949-release-readme-followups/cli/2026-01-13T02-26-19-647Z-2684eb72/manifest.json`, `docs/TASKS.md`, `.agent/task/0949-release-readme-followups.md`, `tasks/tasks-0949-release-readme-followups.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Implementation: README + repo guide wording + short alias + release notes parsing fix + archive auto-merge fallback. Evidence: `README.md`, `docs/README.md`, `package.json`, `package-lock.json`, `.github/workflows/release.yml`, `.github/workflows/archive-automation-base.yml`.
- [x] Validation: implementation-gate manifest captured. Evidence: `.runs/0949-release-readme-followups/cli/2026-01-13T02-26-54-969Z-dd0727c2/manifest.json`.
