# PRD - Release + Cloud + RLM Hardening (0962)

## Summary
- Problem Statement: Recent work exposed preventable friction in release triggering, cloud canary setup failures, symbolic deliberation artifact volume, and recurring lint/docs workflow overhead.
- Desired Outcome: Land a focused hardening pass that improves release safety, cloud canary determinism, symbolic maintainability, and docs/skills ergonomics without broad refactors.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Implement the highest-impact improvements end-to-end so CO is more reliable, lower-friction, and better aligned with agent-first autonomy and npm/downstream shipping quality.
- Success criteria / acceptance:
  - Release workflow blocks invalid manual dispatch contexts, enforces signed-tag policy checks, and handles prerelease tags safely.
  - Cloud canary fails fast when Codex CLI/cloud branch prerequisites are missing and emits actionable diagnostics.
  - Symbolic deliberation remains enabled by default but reduces artifact noise; output_var/final_var contracts have stronger tests.
  - Existing `rlmRunner` logger warnings are removed.
  - Workflow/docs updates are limited to two concrete deliverables: a micro-task policy section and downstream skill-install/release guidance.
- Constraints / non-goals:
  - No architecture rewrite of symbolic runtime.
  - No destructive git cleanup of existing local uncommitted files.
  - Keep behavior backward-compatible for current npm users.

## Goals
- Improve release safety and reproducibility for both tag-triggered and manual dispatch runs.
- Improve cloud canary CI signal quality by turning ambiguous skips into deterministic preflight failures.
- Reduce symbolic deliberation output noise while preserving planning quality and observability.
- Remove known lint debt in `rlmRunner`.
- Reduce process friction in docs/skills usage while preserving auditability.

## Non-Goals
- Replacing the entire release system.
- Replacing symbolic loop architecture.
- Introducing new external services or databases.

## Stakeholders
- Product: CO operators and maintainers shipping npm releases.
- Engineering: Orchestrator runtime/CI maintainers and downstream integrators.

## Metrics & Guardrails
- Primary Success Metrics:
  - Release workflow emits clear failures for invalid refs/signing gaps before publish stage.
  - Cloud canary failures identify preflight cause directly (CLI unavailable, branch missing, env missing).
  - Symbolic tests cover final_var/output_var and deliberation-enabled flow without regressions.
  - Lint warnings in `orchestrator/src/cli/rlmRunner.ts` reduced to zero.
- Guardrails / Error Budgets:
  - Preserve existing release path for `vX.Y.Z` and prerelease tags.
  - Preserve symbolic defaults (`RLM_SYMBOLIC_DELIBERATION=1`).
  - Keep changes scoped and reviewable.

## User Experience
- Personas:
  - Release owner publishing CO to npm.
  - Maintainer triaging CI and bot feedback.
  - Agent operator running symbolic/delegated loops.
- User Journeys:
  - Maintainer runs release -> workflow validates tag context early -> publish succeeds or fails with direct fix guidance.
  - Cloud canary runs -> preflight catches missing CLI/branch/env before deep execution.
  - Symbolic loop runs with deliberation -> useful summary remains, artifact volume is controlled unless debug explicitly enabled.

## Technical Considerations
- Architectural Notes:
  - Release metadata resolution must produce a canonical tag across event types.
  - Cloud canary script should perform branch preflight with explicit remote checks.
  - Symbolic deliberation artifact persistence should be optional and env-gated.
- Dependencies / Integrations:
  - `.github/workflows/release.yml`
  - `.github/workflows/cloud-canary.yml`
  - `scripts/cloud-canary-ci.mjs`
  - `orchestrator/src/cli/rlm/symbolic.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/tests/RlmSymbolic.test.ts`
  - `docs/AGENTS.md`, `docs/standalone-review-guide.md`, `docs/release-notes-template-addendum.md`

## Open Questions
- None blocking. Decision recorded: deliberation summary metrics remain default, while prompt/output/meta artifact files are emitted only when `RLM_SYMBOLIC_DELIBERATION_LOG=1`.

## Approvals
- Product: Approved by user (2026-02-14)
- Engineering: Pending implementation review
- Design: N/A
