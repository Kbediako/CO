# ACTION_PLAN - Codex CLI Upgrade Audit + CO Capability Adoption (0980)

## Summary
- Goal: align CO with latest Codex CLI capabilities and defaults via a focused, evidence-backed upgrade pass.
- Scope: audit/reporting, decision log, targeted implementation, full validation, and merged PR lifecycle.
- Assumptions: local `codex` fork and `gh` auth are available; latest stable release remains `0.105.0` during execution.
- Follow-up objective (2026-02-26): document and stage minimal next-step updates for built-ins-first/high-reasoning defaults, additive config policy, simulation ownership, docs relevance governance, and fallback exception handling.

## Milestones & Sequencing
1) Evidence and docs-first
- Capture release/fork/surface evidence (delegated + direct checks).
- Draft PRD + TECH_SPEC + ACTION_PLAN + task checklist and register mirrors.
2) Decision + implementation
- Finalize depth/thread recommendations by workload.
- Apply minimal high-leverage updates across CO code/config/docs/skills/templates.
3) Validation + release
- Run required check chain and pack smoke.
- Open PR, resolve feedback/checks, monitor quiet window, merge, and clean branch.
4) Follow-up docs-first hardening
- Refresh PRD/spec/action/checklist/index snapshot with explicit adopt-now vs defer recommendations.
- Extend `skills/collab-evals` to cover config/RLM/docs-relevance simulation scenarios.
- Keep new work scoped to docs/skills/task metadata only.

## Dependencies
- `gh` release metadata + local fork git refs.
- Existing CO guardrail/test scripts.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - Revert this task’s commit range from the feature branch if validation/regression issues emerge.

## Risks & Mitigations
- Risk: over-updating defaults without sufficient stability evidence.
  - Mitigation: use workload-specific recommendation matrix and include explicit fallback guidance.
- Risk: inconsistent wording across AGENTS/docs/skills.
  - Mitigation: run targeted cross-reference grep and docs checks before merge.
- Risk: upstream changes during execution drift findings.
  - Mitigation: stamp findings with concrete timestamps and stable release tags.
- Risk: turning fallback profiles into implied routine defaults.
  - Mitigation: keep `12/4/4` baseline prominent and require evidence for `8/2/2` and `6/1/1` usage.
- Risk: noisy docs relevance gate if enforced too early.
  - Mitigation: start with agent-first delegated relevance checks and promote to deterministic test only after measured signal quality.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-26
