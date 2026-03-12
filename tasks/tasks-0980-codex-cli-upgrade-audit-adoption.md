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

### Follow-up docs-first update (2026-02-26)
- [x] Recommendation matrix documented with adopt-now vs defer decisions for built-ins/high-reasoning defaults, additive config updates, simulation ownership, RLM default-capability posture, docs relevance governance, delegation emphasis, and fallback rationale. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN refreshed for follow-up scope and cross-links, with spec `last_review` updated. - Evidence: `docs/PRD-codex-cli-upgrade-audit-adoption.md`, `tasks/specs/0980-codex-cli-upgrade-audit-adoption.md`, `docs/ACTION_PLAN-codex-cli-upgrade-audit-adoption.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] `collab-evals` skill updated to include scenario/mock/simulation guidance for additive config, RLM default-capability checks, docs relevance checks, and delegation-first autonomy posture. - Evidence: `skills/collab-evals/SKILL.md`.
- [x] Runtime/CLI implementation of additive config merge semantics validated end-to-end (non-destructive user config preservation of unrelated keys). - Evidence: `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/tests/CodexDefaultsSetup.test.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Decide and codify docs relevance posture: keep agent-first delegated relevance checks now, defer deterministic hard gate until measured signal quality is stable. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`, `skills/collab-evals/SKILL.md`.
- [x] Deliberate on `rlm` runtime rework and record decision to keep default-codex-capability overlays (no major runtime rewrite in this cycle). - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.

### Follow-up implementation (2026-02-26b)
- [x] Docs-first refresh completed for follow-up scope (doctor defaults drift advisory, docs relevance advisory lane, built-ins-first guidance tightening, awaiter triage docs). - Evidence: `docs/PRD-codex-cli-upgrade-audit-adoption.md`, `tasks/specs/0980-codex-cli-upgrade-audit-adoption.md`, `docs/ACTION_PLAN-codex-cli-upgrade-audit-adoption.md`, `docs/TASKS.md`, `.agent/task/0980-codex-cli-upgrade-audit-adoption.md`, `tasks/index.json`.
- [x] `doctor` surfaces codex defaults drift advisory (model/reasoning/agent limits) with additive remediation guidance. - Evidence: `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/_reproIssueLogTask.test.ts`.
- [x] Non-blocking docs-relevance advisory lane shipped and documented for agent/delegation workflows. - Evidence: `codex.orchestrator.json`, `README.md`, `tests/cli-command-surface.spec.ts`, `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Built-ins-first RLM guidance tightened (no runtime rewrite, specialization by measured value only). - Evidence: `AGENTS.md`, `templates/codex/AGENTS.md`, `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Awaiter long-wait vs stuck triage guidance added to shipped docs. - Evidence: `README.md`, `AGENTS.md`, `templates/codex/AGENTS.md`.
- [x] Throwaway repo mock/dummy/simulated tests executed for all follow-up changes with logs captured. - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-01-setup.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-02-defaults-additive-assert.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-03-doctor-after-assert.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-04-docs-relevance-assert.log`.

### Follow-up implementation (2026-02-26c)
- [x] Docs-first refresh completed for watch-resolve-merge follow-up scope (PR monitor action-required semantics + SOP/skill guidance updates). - Evidence: `docs/PRD-codex-cli-upgrade-audit-adoption.md`, `tasks/specs/0980-codex-cli-upgrade-audit-adoption.md`, `docs/ACTION_PLAN-codex-cli-upgrade-audit-adoption.md`, `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`, `.runs/0980-codex-cli-upgrade-audit-adoption/cli/2026-02-26T11-05-27-918Z-5f6d4aac/manifest.json`.
- [x] Shipped `codex-orchestrator pr resolve-merge` command wired to existing monitor logic with default exit-on-action-required behavior. - Evidence: `bin/codex-orchestrator.ts`, `scripts/lib/pr-watch-merge.js`, `scripts/lib/pr-watch-merge.d.ts`, `scripts/pr-resolve-merge.mjs`, `package.json`, `.runs/0980-codex-cli-upgrade-audit-adoption/cli/2026-02-26T11-05-27-918Z-5f6d4aac/manifest.json`.
- [x] Action-required classification tests + CLI command-surface coverage added for resolve-merge behavior. - Evidence: `tests/pr-watch-merge.spec.ts`, `tests/cli-command-surface.spec.ts`, `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226c/05-test.log`, `.runs/0980-codex-cli-upgrade-audit-adoption/cli/2026-02-26T11-05-27-918Z-5f6d4aac/manifest.json`.
- [x] Operator docs/skills updated to prefer resolve-merge for active PR loops and retain watch-merge for passive monitoring. - Evidence: `README.md`, `.agent/SOPs/review-loop.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `skills/release/SKILL.md`, `.runs/0980-codex-cli-upgrade-audit-adoption/cli/2026-02-26T11-05-27-918Z-5f6d4aac/manifest.json`.

### Implementation updates
- [x] CO code/config/docs/skills updated for adopted defaults and capability posture. - Evidence: `README.md`, `AGENTS.md`, `.agent/AGENTS.md`, `templates/codex/AGENTS.md`, `docs/guides/collab-vs-mcp.md`, `docs/guides/rlm-recursion-v2.md`, `docs/guides/upstream-codex-cli-sync.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `scripts/codex-cli-refresh.sh`.
- [x] Cross-link consistency verified across AGENTS/README/docs/skills/templates. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] Downstream-facing wording updated where old limits/defaults were referenced. - Evidence: `README.md`, `templates/codex/AGENTS.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.

### Validation and release lifecycle
- [x] Required check sequence passed with evidence logs. - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/01-delegation-guard-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/02-spec-guard-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/03-build-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/04-lint-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/05-test-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/06-docs-check-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/07-docs-freshness-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/08-diff-budget-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/10-review-final.log`; follow-up refresh logs: `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226-r3/01-delegation-guard.log` through `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226-r3/09-review.log`; follow-up implementation logs: `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/01-delegation-guard.log` through `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/10-pack-smoke.log`; follow-up PR monitor logs: `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226c/01-delegation-guard.log` through `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226c/10-pack-smoke.log`.
- [x] `npm run pack:smoke` passed (skills/docs downstream packaging surface touched). - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/09-pack-smoke-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226-r3/10-pack-smoke.log`.
- [x] Post-implementation standalone review + elegance pass completed. - Evidence: `out/0980-codex-cli-upgrade-audit-adoption/manual/10-review-final.log`, `out/0980-codex-cli-upgrade-audit-adoption/manual/11-elegance-final.md`.
- [x] PR opened with audit summary + decision log + validation evidence. - Evidence: `https://github.com/Kbediako/CO/pull/257`.
- [x] PR checks/bot feedback resolved, quiet-window observed, PR merged, branch cleaned. - Evidence: `https://github.com/Kbediako/CO/pull/257`, merge commit `c64cde2e59659b9ed8fb2b9f7a149587f99ba5ce`.

### Deliverable artifacts
- [x] Publish concise change report and decision log artifact in repo docs. - Evidence: `docs/findings/0980-codex-cli-upgrade-audit-2026-02-25.md`.
- [x] Final handoff includes merged PR link + merge commit SHA + follow-up recommendations. - Evidence: `https://github.com/Kbediako/CO/pull/257`, merge commit `c64cde2e59659b9ed8fb2b9f7a149587f99ba5ce`.
