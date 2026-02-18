# ACTION_PLAN - Multi-Agent Canonical Terminology + Compatibility Alignment (0972)

## Summary
- Goal: ship canonical `multi_agent` terminology alignment without breaking legacy compatibility contracts.
- Scope: docs-first artifacts, policy-driven wording updates, targeted compatibility validation.
- Assumptions: Codex CLI continues to expose `multi_agent` as canonical and may keep `collab` alias during transition.

## Milestones & Sequencing
1) Docs-first scaffold + task/mirror/index registration.
2) Pre-implementation docs-review evidence capture for task `0972`.
3) Implement phase-1 migration: canonical wording updates + minimal help/doctor copy hardening.
4) Implement phase-2 migration: additive canonical aliases (`--multi-agent`, `RLM_SYMBOLIC_MULTI_AGENT`) + legacy warnings.
5) Validate with targeted tests, docs hygiene, and manual CLI smoke runs; run standalone/elegance pass.
6) Publish phase-3 cutover policy for the post-legacy world (compatibility window, removal gate, release-note requirement).

## Dependencies
- Existing collab/multi-agent integration docs and tests.
- Codex CLI feature report output (`codex features list`).

## Validation
- Checks / tests:
  - `npm run test -- orchestrator/tests/Doctor.test.ts orchestrator/tests/DoctorUsage.test.ts orchestrator/tests/RlmRunnerMode.test.ts tests/cli-command-surface.spec.ts`
  - `npm run docs:check`
  - `npm run lint`
  - `npm run build`
- Manual smoke:
  - `codex-orchestrator rlm --help`
  - `codex-orchestrator rlm "<goal>" --multi-agent false --validator none --max-iterations 1`
  - `codex-orchestrator rlm "<goal>" --collab false --validator none --max-iterations 1`
  - `RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY=warn RLM_SYMBOLIC_MULTI_AGENT_ALLOW_DEFAULT_ROLE=1 codex-orchestrator rlm "<goal>" --multi-agent false --validator none --max-iterations 1` (legacy aliases still accepted)
- Rollback plan:
  - Revert wording-only changes if user-facing confusion increases.
  - Keep compatibility code paths unchanged to prevent behavioral regressions.

## Risks & Mitigations
- Risk: accidental breaking rename of legacy runtime/schema keys.
  - Mitigation: explicitly scope phase-1 to canonical wording and compatibility-safe messaging.
- Risk: inconsistent terminology across shipped and global skills.
  - Mitigation: update shared CO skills and sync to global skill set.

## Approvals
- Reviewer: user
- Date: 2026-02-18
