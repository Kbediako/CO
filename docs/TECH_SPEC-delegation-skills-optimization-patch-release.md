# TECH_SPEC - Delegation Skills Optimization + Patch Release (0960)

## Summary
- Objective: Validate/optimize delegation skill packaging behavior and publish a patch version for downstream users.
- Scope: skill-install tests, manual smoke evidence capture, package version bump, docs/task mirrors.
- Constraints: minimal, backward-compatible change set.

## Technical Requirements
- Functional requirements:
  - Verify `delegation-usage` installs with canonical guidance text.
  - Verify `delegate-early` installs as a compatibility alias pointing to `delegation-usage`.
  - Preserve skill install CLI semantics (`--force`, `--codex-home`).
  - Bump package metadata to patch version.
- Non-functional requirements:
  - Keep tests deterministic and fast.
  - Avoid introducing interactive commands in validation flow.
- Interfaces / contracts:
  - No manifest schema changes.
  - No CLI breaking changes.

## Architecture and Data
- Architecture / design adjustments:
  - Test-only assertions layered onto existing skill installation behavior.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - npm package metadata + release workflow.

## Validation Plan
- Tests / checks:
  - Expand `orchestrator/tests/SkillsInstall.test.ts` coverage for canonical/alias assertions.
  - Run full quality gate chain.
  - Run manual `skills install` smoke with temp `--codex-home` and verify installed files.
- Rollout verification:
  - Confirm PR checks and bot review are green.
- Monitoring / alerts:
  - Standard release and CI checks.

## Evidence
- Delegation planning scout: `.runs/0960-delegation-skills-optimization-patch-release-scout/cli/2026-02-14T04-19-55-140Z-4a1c33a9/manifest.json`.
- Docs-review: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-21-56-223Z-3864b232/manifest.json`.
- Implementation-gate: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-24-11-249Z-38fdc882/manifest.json`.
- Manual smoke logs: `out/0960-delegation-skills-optimization-patch-release/manual/skills-install-smoke.log`, `out/0960-delegation-skills-optimization-patch-release/manual/delegation-usage-assertions.log`, `out/0960-delegation-skills-optimization-patch-release/manual/delegate-early-assertions.log`.
- Targeted validation logs: `out/0960-delegation-skills-optimization-patch-release/manual/skills-install-vitest.log`, `out/0960-delegation-skills-optimization-patch-release/manual/skills-pack-audit.log`.
- Implementation artifacts: `orchestrator/tests/SkillsInstall.test.ts`, `package.json`, `package-lock.json`.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
