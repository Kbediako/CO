# Task Checklist - 1004-codex-0110-version-policy-refresh-and-adoption-sequencing

- MCP Task ID: `1004-codex-0110-version-policy-refresh-and-adoption-sequencing`
- Primary PRD: `docs/PRD-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
- TECH_SPEC: `tasks/specs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-0110-version-policy-refresh-and-adoption-sequencing.md`

> Set `MCP_RUNNER_TASK_ID=1004-codex-0110-version-policy-refresh-and-adoption-sequencing` for orchestrator commands. Required docs lane for this planning slice: `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). - Evidence: `docs/PRD-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `docs/TECH_SPEC-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `docs/ACTION_PLAN-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `tasks/specs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `tasks/tasks-1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `.agent/task/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`.
- [x] External/local audit facts captured with explicit `confirmed` vs `inferred` classification. - Evidence: `docs/findings/1004-codex-cli-0110-upgrade-deliberation.md`, `docs/findings/1004-agents-router-simplification-deliberation.md`, `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/01-local-codex-cli-audit.log`, `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/02b-external-openai-codex-release-audit.json`, `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/03-local-codex-fork-delta-audit.log`, `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/04b-local-agents-router-audit.log`.
- [x] Sequencing slices and risk controls are explicit in planning docs (`1004 -> 1005 -> 1006 conditional -> 1007 -> 1008`). - Evidence: `docs/PRD-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `tasks/specs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated for task registration. - Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Validation
- [x] docs-review manifest captured for task 1004 with terminal success. - Evidence: `.runs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/cli/2026-03-05T08-43-25-261Z-b48d62dc/manifest.json`, `.runs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/cli/2026-03-05T08-43-25-261Z-b48d62dc/runner.ndjson`, `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T085110Z-closeout-completion-check/00-closeout-summary.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/11-spec-guard-final.log`.
- [x] `npm run docs:check`. - Evidence: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/12-docs-check-final.log`.
- [x] `npm run docs:freshness`. - Evidence: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/13-docs-freshness-final.log`.
- [x] Task checklist mirror parity log captured. - Evidence: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/09-mirror-parity.log`.
- [x] Short docs-first summary note captured with evidence pointers. - Evidence: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/10-docs-first-summary.md`.

## Scope Guardrails
- [x] Plugin governance is explicitly deferred out of scope. - Evidence: `docs/PRD-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `tasks/specs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`.
- [x] No default flip without canary evidence is explicitly enforced. - Evidence: `docs/PRD-codex-0110-version-policy-refresh-and-adoption-sequencing.md`, `docs/ACTION_PLAN-codex-0110-version-policy-refresh-and-adoption-sequencing.md`.
- [x] No runtime code edits in this lane. - Evidence: this task scope + docs-only diff.

## Closeout
- [x] Final status decision recorded as completed after terminal docs-review success. - Evidence: `.runs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/cli/2026-03-05T08-43-25-261Z-b48d62dc/manifest.json`, `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T085110Z-closeout-completion-check/00-closeout-summary.md`.
- [x] Checklist mirror parity reconfirmed post-closeout updates. - Evidence: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T085110Z-closeout-completion-check/01-mirror-parity.log`.
