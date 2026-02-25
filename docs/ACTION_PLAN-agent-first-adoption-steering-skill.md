# ACTION_PLAN - Agent-First Adoption Steering Skill (0978)

## Summary
- Goal: deliver a downstream-shippable bundled skill that steers advanced capability usage with autonomy-first guidance and hybrid run/event/time controls.
- Scope: docs-first scaffolding, skill drafting, registry updates, and tailored standalone/elegance validation.
- Assumptions: this task is guidance-only and does not modify runtime nudge code.

## Milestones & Sequencing
1) Docs-first scaffolding
- Draft PRD + TECH_SPEC + ACTION_PLAN + task checklist + mirror.
- Register task/spec in `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry.
2) Pre-implementation docs gate
- Run docs-review pipeline and capture manifest evidence.
3) Skill drafting
- Add new bundled skill with autonomy-first policy and hybrid control guidance.
- Update README bundled skills list.
4) Tailored review validation
- Run standalone review focused on correctness/risk.
- Run elegance review focused on minimality/coherence.
- Capture logs and update checklist evidence.

## Dependencies
- Existing docs-first/task registry conventions.
- Existing bundled skills structure under `skills/`.

## Validation
- Checks / tests:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 0978-agent-first-adoption-steering-skill`
  - tailored standalone review (log capture)
  - tailored elegance review (log capture)
- Rollback plan:
  - Revert newly added skill/docs and registry entries if review identifies coercive or noisy policy design.

## Risks & Mitigations
- Risk: guidance drifts into coercive behavior.
  - Mitigation: explicit wording contract + review prompts focused on autonomy.
- Risk: run-only or time-only policy gets overfit.
  - Mitigation: adopt hybrid policy with low-volume fallback.

## Approvals
- Reviewer: user
- Date: 2026-02-25
