# Task Checklist - Codex CLI Upgrade Audit + CO Capability Adoption (0980)

- MCP Task ID: `0980-codex-cli-upgrade-audit-adoption`
- Primary PRD: `docs/PRD-codex-cli-upgrade-audit-adoption.md`
- TECH_SPEC: `tasks/specs/0980-codex-cli-upgrade-audit-adoption.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-cli-upgrade-audit-adoption.md`
- Summary of scope: deep Codex CLI upgrade audit, fork delta analysis, explicit depth/thread default decisions, and targeted CO code/config/docs/skills upgrades with full validation + PR lifecycle.

> Set `MCP_RUNNER_TASK_ID=0980-codex-cli-upgrade-audit-adoption` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; add `npm run pack:smoke` when touching downstream-facing CLI/package/skills/review-wrapper paths.

## Checklist

### Foundation and evidence intake
- [x] Delegated analysis streams captured (release intelligence, local fork delta, CO surface inventory). - Evidence: `.runs/0980-codex-cli-upgrade-audit-adoption-scout/cli/2026-02-25T22-14-18-886Z-e15086b5/manifest.json`, `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Task scaffolding + mirrors + registries registered. - Evidence: `tasks/tasks-0980-codex-cli-upgrade-audit-adoption.md`, `.agent/task/0980-codex-cli-upgrade-audit-adoption.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-codex-cli-upgrade-audit-adoption.md`, `tasks/specs/0980-codex-cli-upgrade-audit-adoption.md`, `docs/ACTION_PLAN-codex-cli-upgrade-audit-adoption.md`, `docs/TECH_SPEC-codex-cli-upgrade-audit-adoption.md`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0980-codex-cli-upgrade-audit-adoption/cli/2026-02-25T22-19-25-628Z-748048f3/manifest.json`.
- [x] Pre-implementation standalone review approval captured. - Evidence: `docs/REVIEW-0980-codex-cli-upgrade-audit-adoption-pre-implementation.md`.

### Audit and decisions
- [x] Latest Codex CLI change report completed with source evidence (release + behavioral deltas). - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Local fork vs upstream `main` delta summary completed (ahead/behind + commit deltas). - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Depth-by-workload decision log completed (recommended defaults + alternatives rejected + risk tradeoffs). - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Agent limit `12` adoption decision completed and reflected across impacted CO surfaces. - Evidence: `README.md`, `AGENTS.md`, `templates/codex/AGENTS.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.
- [x] Additional non-depth upgrades identified and prioritized by impact/effort. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] User follow-up deliberations captured (depth ideality, default spawning vs RLM, multi-turn subagents, fallback posture, review failure analysis). - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.

### Implementation updates
- [x] CO code/config/docs/skills updated for adopted defaults and capability posture. - Evidence: `README.md`, `AGENTS.md`, `.agent/AGENTS.md`, `templates/codex/AGENTS.md`, `docs/guides/collab-vs-mcp.md`, `docs/guides/rlm-recursion-v2.md`, `docs/guides/upstream-codex-cli-sync.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `scripts/codex-cli-refresh.sh`.
- [x] Cross-link consistency verified across AGENTS/README/docs/skills/templates. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] Downstream-facing wording updated where old limits/defaults were referenced. - Evidence: `README.md`, `templates/codex/AGENTS.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.

### Validation and release lifecycle
- [x] Required check sequence passed with evidence logs. - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/01-delegation-guard-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/02-spec-guard-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/03-build-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/04-lint-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/05-test-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/06-docs-check-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/07-docs-freshness-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/08-diff-budget-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/10-review-final.log`.
- [x] `npm run pack:smoke` passed (skills/docs downstream packaging surface touched). - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/09-pack-smoke-final.log`.
- [x] Post-implementation standalone review + elegance pass completed. - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/10-review-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/11-elegance-final.md`.
- [ ] PR opened with audit summary + decision log + validation evidence.
- [ ] PR checks/bot feedback resolved, quiet-window observed, PR merged, branch cleaned.

### Deliverable artifacts
- [x] Publish concise change report and decision log artifact in repo docs. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [ ] Final handoff includes merged PR link + merge commit SHA + follow-up recommendations.
