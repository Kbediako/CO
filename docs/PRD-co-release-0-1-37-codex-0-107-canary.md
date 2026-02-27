# PRD - CO 0.1.37 Release + Codex 0.107 Canary

## Summary
- Problem Statement: CO main now includes critical runtime/review safety fixes from task 0984, but downstream users still receive 0.1.36; a new Codex CLI prerelease (0.107.x) also exists and needs controlled compatibility validation before any global adoption decision.
- Desired Outcome: Ship CO 0.1.37 safely, and produce evidence-backed guidance on whether to keep global Codex pinned to stable 0.106.0 or advance to 0.107.x.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Execute the approved next step immediately: release CO patch updates, then run deliberate canary automation in dummy repos for the new Codex update before changing defaults globally.
- Success criteria / acceptance:
  - CO 0.1.37 is released from main with signed tag + publish evidence.
  - Codex 0.107 canary matrix runs in dummy repos with pass/fail telemetry and fallback behavior checks.
  - Clear go/no-go decision recorded for global Codex update.
- Constraints / non-goals:
  - Docs-first and checklist mirror discipline.
  - No unrelated refactors.
  - Preserve runtime safety and break-glass fallback behavior.

## Goals
- Ship `@kbediako/codex-orchestrator@0.1.37` with current main fixes.
- Validate Codex `0.107.x` compatibility in automated dummy-repo scenarios (review/run-review/flow/cloud-mode checks).
- Record a concrete default-version recommendation (stable vs prerelease) with evidence.

## Non-Goals
- Forcing global adoption of a prerelease without canary evidence.
- Changing CO runtime architecture beyond already-merged fixes.
- Reworking unrelated docs/process areas.

## Stakeholders
- Product: CO maintainers/operators.
- Engineering: CO runtime/release owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - Release publish success (`npm view @kbediako/codex-orchestrator version` returns `0.1.37`).
  - Canary matrix pass rate and deterministic fallback/error behavior are within acceptance thresholds defined in TECH_SPEC.
- Guardrails / Error Budgets:
  - Any P0/P1 regression in baseline dummy scenarios blocks Codex default change.
  - No merge without unresolved-actionable-thread closure.

## User Experience
- Personas: CO maintainers, downstream operators.
- User Journeys:
  - Maintainer ships patch safely.
  - Operator receives explicit recommendation for Codex version policy.

## Technical Considerations
- Architectural Notes:
  - Release lane: version bump PR -> monitored merge -> signed tag -> release workflow -> npm publish.
  - Canary lane: compare stable (`0.106.0`) and prerelease (`0.107.x`) behaviors across representative command paths.
- Dependencies / Integrations:
  - GitHub Actions release workflow.
  - npm publish credentials.
  - GitHub CLI authentication.

## Open Questions
- Whether prerelease canary quality is high enough to justify immediate global adoption vs deferred adoption at next stable.

## Approvals
- Product: User approved 2026-02-27.
- Engineering: Pending implementation completion.
- Design: N/A.

## Resolution (2026-02-27)
- Release goal met: `@kbediako/codex-orchestrator@0.1.37` shipped and verified.
- Canary goal fully met: stable/prerelease automation executed, including required cloud-contract reruns with CO-scoped `CODEX_CLOUD_ENV_ID=Kbediako/CO`.
- Decision: move global Codex default to `0.107.0-alpha.4`, while keeping `0.106.0` rollback pin documented as break-glass.
