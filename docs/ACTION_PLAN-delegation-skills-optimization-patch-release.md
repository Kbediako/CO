# ACTION_PLAN - Delegation Skills Optimization + Patch Release (0960)

## Summary
- Goal: Ship a tested delegation skill optimization patch to downstream users with minimal risk.
- Scope: tests + smoke validation + patch version bump + docs/task mirrors.
- Assumptions: current delegation skill content is directionally correct; this pass focuses on verification + ship readiness.

## Milestones and Sequencing
1) Docs-first scaffolding + task mirrors.
2) Add/adjust skill-install tests for canonical + alias behavior.
3) Run manual skill-install smoke check using temp codex home.
4) Bump package version for patch release and update lockfile.
5) Run full quality gate chain and finalize PR evidence.

## Dependencies
- Existing `installSkills` implementation.
- Existing release workflow (`tag == package version`).

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
- Manual validation:
  - `codex-orchestrator skills install --force --codex-home <temp-dir>` + file/content verification for `delegation-usage` and `delegate-early`.

## Risks and Mitigations
- Risk: tests validate text too rigidly and become brittle.
  - Mitigation: assert stable intent phrases, not entire file snapshots.
- Risk: release metadata drift.
  - Mitigation: bump `package.json` + lockfile together and rely on release workflow checks.

## Evidence
- Planning scout: `.runs/0960-delegation-skills-optimization-patch-release-scout/cli/2026-02-14T04-19-55-140Z-4a1c33a9/manifest.json`.
- Docs-review: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-21-56-223Z-3864b232/manifest.json`.
- Implementation-gate: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-24-11-249Z-38fdc882/manifest.json`.
- Manual validation logs: `out/0960-delegation-skills-optimization-patch-release/manual/skills-install-smoke.log`, `out/0960-delegation-skills-optimization-patch-release/manual/delegation-usage-assertions.log`, `out/0960-delegation-skills-optimization-patch-release/manual/delegate-early-assertions.log`.
- Targeted validation logs: `out/0960-delegation-skills-optimization-patch-release/manual/skills-install-vitest.log`, `out/0960-delegation-skills-optimization-patch-release/manual/skills-pack-audit.log`.
- Code/test changes: `orchestrator/tests/SkillsInstall.test.ts`, `package.json`, `package-lock.json`.
