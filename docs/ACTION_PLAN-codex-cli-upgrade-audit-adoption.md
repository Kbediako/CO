# ACTION_PLAN - Codex CLI Upgrade Audit + CO Capability Adoption (0980)

## Summary
- Goal: align CO with latest Codex CLI capabilities and defaults via a focused, evidence-backed upgrade pass.
- Scope: audit/reporting, decision log, targeted implementation, full validation, and merged PR lifecycle.
- Assumptions: local `codex` fork and `gh` auth are available; latest stable release remains `0.105.0` during execution.
- Follow-up scope (2026-02-26b): implement doctor defaults-drift advisory, docs-relevance advisory lane, built-ins-first RLM guidance tightening, and awaiter triage documentation.

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
4) Follow-up hardening (2026-02-26b)
- Add doctor codex-defaults drift advisory output + remediation guidance (`codex defaults --yes`).
- Add a non-blocking docs-relevance advisory lane (agent/delegation friendly).
- Update built-ins-first + awaiter-triage guidance in AGENTS/README/findings.
- Validate in-repo + throwaway-repo simulated runs.

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
  - throwaway repo simulation runs covering: `doctor` drift advisory, docs-relevance advisory lane, and awaiter triage guidance discoverability.
- Rollback plan:
  - Revert this task’s commit range from the feature branch if validation/regression issues emerge.

## Risks & Mitigations
- Risk: over-updating defaults without sufficient stability evidence.
  - Mitigation: use workload-specific recommendation matrix and include explicit fallback guidance.
- Risk: inconsistent wording across AGENTS/docs/skills.
  - Mitigation: run targeted cross-reference grep and docs checks before merge.
- Risk: upstream changes during execution drift findings.
  - Mitigation: stamp findings with concrete timestamps and stable release tags.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-26
