---
id: 20260325-linear-cc7d12e3-eabf-4168-827e-b3a023583e22
title: CO Align Non-Interactive Standalone Review Policy Across Gate Advisory and Provider-Worker Lanes
relates_to: docs/PRD-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md
risk: high
owners:
  - Codex
last_review: 2026-03-25
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- PRD: `docs/PRD-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- Task checklist: `tasks/tasks-linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`

## Traceability
- Linear issue: `CO-12` / `cc7d12e3-eabf-4168-827e-b3a023583e22`
- Linear URL: https://linear.app/asabeko/issue/CO-12/co-align-non-interactive-standalone-review-policy-across-gate-advisory

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: align CO's unattended standalone-review policy across gate, advisory, and provider-worker lanes without changing the truthful default wrapper behavior.
- Scope:
  - docs-first registration and Symphony/CO baseline audit for the current Linear worker issue
  - one explicit unattended lane matrix across gate, advisory, direct wrapper, and provider-worker review flows
  - bounded config/runtime/docs changes in `codex.orchestrator.json`, `AGENTS.md`, `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`, and `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - focused contract coverage for the chosen unattended-policy path
- Constraints:
  - keep the current handoff-only standalone wrapper behavior truthful unless a lane explicitly opts into forced execution
  - do not widen into elegance-review policy or unrelated provider features
  - record delegation override explicitly because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - raw non-interactive `codex-orchestrator review` / `npm run review` invocations must remain handoff-only unless `FORCE_CODEX_REVIEW=1` is present
  - `docs-review` and `implementation-gate` must remain explicit forced-review lanes in unattended runs
  - advisory review lanes must remain prompt-only/non-blocking unless they explicitly opt into forcing
  - provider-worker closeout must clearly state whether standalone review is handoff-only or autonomous-forced before `In Review`
  - provider-worker unattended execution must match that stated policy in runtime/config behavior
  - operator-facing docs and skills must describe the same lane matrix and avoid calling handoff-only behavior a bug
- Non-functional requirements (performance, reliability, security):
  - keep the patch narrow to existing review wrapper, pipeline config, and provider-worker prompt/env seams
  - preserve auditability by keeping lane behavior explicit in config/docs/tests
  - avoid introducing new provider capabilities outside the review execution contract
- Interfaces / contracts:
  - wrapper contract: `scripts/lib/review-non-interactive-handoff.ts`, `scripts/run-review.ts`
  - pipeline contract: `codex.orchestrator.json`
  - provider-worker contract: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - operator docs/skill contract: `AGENTS.md`, `docs/AGENTS.md`, `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`

## Architecture & Data
- Architecture / design adjustments:
  - keep the wrapper's direct-call default unchanged: unattended review is prompt-only unless the lane or operator sets `FORCE_CODEX_REVIEW=1`
  - keep gate lanes explicit about forcing review execution in unattended runs
  - keep advisory review prompt-only so non-blocking semantic signals do not masquerade as deterministic forced review execution
  - make provider-worker closeout an explicit autonomous-forced standalone-review lane by setting the relevant review env at the provider-worker pipeline boundary and by updating the provider-worker prompt to require that final review before review handoff
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - local Symphony checkout used as the policy baseline
  - current CO review wrapper and provider-worker pipeline/runtime

## Validation Plan
- Tests / checks:
  - docs-review on the new task packet before code edits
  - focused contract coverage in `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and any current standalone-review wrapper test seam touched by the policy change
  - required repo validation floor after implementation
- Rollout verification:
  - confirm gate review stages still force `FORCE_CODEX_REVIEW=1`
  - confirm advisory review stages remain prompt-only in unattended mode
  - confirm provider-worker unattended env/prompt now explicitly opt into forced standalone review before review handoff
  - attach the resulting PR to Linear before transition to `In Review`
- Monitoring / alerts:
  - use the Linear workpad for operator-facing progress
  - use pipeline definition, prompt contract, and focused tests as primary evidence

## Open Questions
- Whether provider-worker closeout should name `implementation-gate` or a manifest-backed `npm run review` call as the canonical final step. Use the smallest truthful wording that matches the implemented env contract.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`
- Date: 2026-03-25

## Manifest Evidence
- Baseline audit: `out/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/manual/20260325T065646Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`
