---
id: 20260423-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b
title: CO-315 release-runbook parity and docs:check truth coverage
relates_to: docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

# TECH_SPEC - CO-315 release-runbook parity and docs:check truth coverage

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- PRD: `docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- Task checklist: `tasks/tasks-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- `.agent` mirror: `.agent/task/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`

## Traceability
- Linear issue: `CO-315` / `b2712a15-b04f-4a4e-aac8-35f614abb01b`
- Shared source 0 anchor: `ctx:sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574#chunk:c000001`
- Source object id: `sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574`
- Origin manifest: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/manifest.json`

## Summary
- Objective: restore truthful parity between the bundled release runbook and the current release SOP/workflow, then make `docs:check` fail when protected release surfaces drift.
- Scope:
  - parent-owned refresh of `skills/release/SKILL.md`
  - parent-owned release truth coverage in `docs/docs-catalog.json` and `scripts/docs-hygiene.ts`
  - parent-owned focused docs validation proving drift in release skill/SOP/addendum is no longer silent
- Constraints:
  - keep the lane bounded to release-runbook parity plus machine-checkability
  - do not change release workflow behavior, dist-tag semantics, or publish policy
  - do not broaden into generic docs-catalog or docs-freshness redesign

## Protected Surfaces
- `skills/release/SKILL.md`
- `.agent/SOPs/release.md`
- `docs/release-notes-template-addendum.md`
- `docs/README.md`
- `.github/workflows/release.yml`
- `docs/docs-catalog.json`
- `scripts/docs-hygiene.ts`
- `RELEASE_SIGNING_PUBLIC_KEYS`
- `RELEASE_SIGNING_ALLOWED_SIGNERS`
- `workflow_dispatch`
- `inputs.tag`
- .github/release-overview.md
- OIDC trusted publishing
- `secrets.NPM_TOKEN`
- `--provenance`

## Validation Plan
- Parent-focused release docs-hygiene coverage proving `docs:check` fails when:
  - the release skill drifts on the validation floor
  - the release skill/SOP drift on signing secret posture
  - release docs drift on manual-dispatch tag semantics
  - release docs drift on overview override behavior
  - release docs drift on OIDC-vs-`NPM_TOKEN` publish posture
- Parent `npm run docs:check`
- Parent `node scripts/spec-guard.mjs --dry-run`
- Parent docs-review after patch import

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- Parent lane owns docs-review, implementation validation, and PR lifecycle after patch import.
