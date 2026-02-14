# PRD - Delegation Skills Optimization + Patch Release (0960)

## Summary
- Problem Statement: Delegation skill guidance was harmonized in source, but we need explicit optimization/testing proof and a shipped patch release so downstream users receive stable behavior.
- Desired Outcome: Validate delegation skill behavior end-to-end, harden tests around canonical/alias semantics, and ship patch release metadata for npm consumers.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Ensure delegation skills are optimized, work reliably in practice, and are shipped to downstream users via the next patch.
- Success criteria / acceptance:
  - Automated tests explicitly validate `delegation-usage` canonical guidance and `delegate-early` compatibility alias behavior.
  - A manual install/smoke verification confirms skills are installed correctly via CLI.
  - Patch release version is bumped and release docs/task evidence are updated.
- Constraints / non-goals:
  - Keep the patch focused; avoid unrelated refactors.
  - Preserve backwards compatibility for users still invoking `delegate-early`.

## Goals
- Raise confidence that shipped skills behave as intended.
- Reduce downstream friction by publishing the validated patch.
- Keep changes minimal and auditable.

## Non-Goals
- Reworking delegation server architecture.
- Expanding into unrelated skill rewrites.

## Stakeholders
- Product: CO operators (agent-first workflows).
- Engineering: Orchestrator/skills maintainers.
- Design: N/A.

## Metrics and Guardrails
- Primary Success Metrics:
  - Skill-install tests pass with explicit assertions for canonical + alias content.
  - Manual smoke install confirms expected files/content.
  - Full required quality gates pass.
- Guardrails / Error Budgets:
  - No regressions in existing test suite.
  - Diff stays within budget without override.

## User Experience
- Personas:
  - Operators using global + bundled skills.
  - Downstream npm users installing released package skills.
- User Journeys:
  - Install skills -> see canonical `delegation-usage` guidance + compatible `delegate-early` alias.
  - Upgrade package -> receive validated skill behavior without workflow breakage.

## Technical Considerations
- Architectural Notes:
  - Extend existing `installSkills` test coverage with delegation-specific assertions.
  - Keep runtime behavior unchanged unless a correctness gap is found.
  - Bump package version for patch release delivery.
- Dependencies / Integrations:
  - Existing CLI skill-install flow.
  - Release workflow that enforces tag/version match.

## Open Questions
- None blocking for this patch scope.

## Evidence
- Delegation skill optimization tests shipped in `orchestrator/tests/SkillsInstall.test.ts` with canonical (`delegation-usage`) and alias (`delegate-early`) assertions.
- Manual CLI install smoke captured under `out/0960-delegation-skills-optimization-patch-release/manual/` (`skills-install-smoke.log`, `delegation-usage-assertions.log`, `delegate-early-assertions.log`).
- Targeted validation logs captured under `out/0960-delegation-skills-optimization-patch-release/manual/` (`skills-install-vitest.log`, `skills-pack-audit.log`).
- Patch version bump captured in `package.json` and `package-lock.json` (`0.1.17`).
- Manifest-backed validation captured in `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-21-56-223Z-3864b232/manifest.json` and `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-24-11-249Z-38fdc882/manifest.json`.

## Approvals
- Product: User approved patch path.
- Engineering: Codex (self).
- Design: N/A.
