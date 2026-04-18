# ACTION_PLAN - CO workflow: restore Apr 18 docs:freshness baseline for Mar 18 stale cohort

## Summary
- Goal: give the parent lane a bounded implementation plan for the Apr 18 docs:freshness baseline repair affecting the Mar 18 `1289-1298` historical packet family.
- Scope: docs-first packet only in this child lane; parent-owned before reports, classification, disposition, registry or cohort-guide updates, validation, review, and PR handoff.
- Assumptions:
  - the shared source payload itself is metadata only
  - the live CO-239 issue cache is the authoritative Apr 18 blocker checksum
  - the smallest correct repair uses the existing docs freshness machinery and owner-evidence surfaces, not a policy redesign

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `CO-175`
  - `rolling freshness cohort`
  - `repo-wide freshness debt`
  - `per-PR diff health`
  - `Mar 18 cohort`
  - `Task Packet`
  - `Task Mirror`
  - `Report Only`
  - `machine-checkable evidence`
  - `70` blocking stale rows
  - `221` rolling cohort entries
  - `1289-1298`
- Not done if:
  - the Mar 18 `1289-1298` cohort still blocks `docs:freshness` with no explicit owner action
  - the repair widens rolling caps or windows
  - CO-175 rolling debt becomes hidden
  - the result is only a blind `last_review` bump
- Pre-implementation issue-quality review:
  - 2026-04-18: CO-239 is already shaped as a bounded Apr 18 baseline owner lane. The packet must keep the live blocker shape explicit and reject reinterpretation as CO-175 reopen, policy redesign, or unrelated feature-lane drift.

## Milestones & Sequencing
1. Create the six docs-first packet files for `linear-a710d9a7-5187-414d-8a8b-beab7853e446`.
2. Parent captures before artifacts on clean current `main`:
   - `npm run docs:freshness`
   - `npm run docs:freshness:maintain` when needed for maintenance proof
3. Parent saves those reports under `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/`.
4. Parent classifies the `70` blocking stale rows by class, path family, lineage, and disposition, including explicit relationship to the `221` visible CO-175 rolling rows.
5. Parent chooses the smallest truthful reviewed disposition for the Mar 18 cohort:
   - refresh
   - archive
   - reclassify
   - explicit re-owner path
6. Parent updates only the owner-evidence surfaces required by that disposition:
   - `docs/docs-freshness-registry.json`
   - `docs/guides/docs-freshness-cohorts.md`
   - `tasks/index.json`
   - `docs/TASKS.md`
7. Parent reruns the freshness proof and any adjacent docs validation needed to prove the blocker is gone without weakening the policy.
8. Parent closes out with an explicit note on whether any stale-looking historical packets remain intentionally visible after the fix, and why.

## Dependencies
- Shared source anchor: `ctx:sha256:0d82ad4fdf8297fae69d0937a0588fb2976cb0c927eb468ec132a5ff9c789318#chunk:c000001`
- Origin manifest: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/manifest.json`
- Live Apr 18 issue checksum:
  - `docs:freshness FAILED - 4071 docs, 4074 registry entries`
  - `70` blocking stale rows
  - `221` CO-175 rolling rows
  - `Task Packet=50`, `Task Mirror=10`, `Report Only=10`
  - lineage `1289-1298`
- Prior owner lanes and precedent:
  - `CO-175`
  - `CO-184`
  - `CO-201`
  - `CO-209`
- Parent-owned implementation surfaces:
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `scripts/docs-freshness.mjs`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/spec-guard.mjs`

## Validation
- Child lane only:
  - `rg -n "docs:freshness|CO-175|rolling freshness cohort|repo-wide freshness debt|per-PR diff health|Mar 18 cohort|Task Packet|Task Mirror|Report Only|machine-checkable evidence|1289-1298|70|221" docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/tasks-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md .agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
  - `git diff --check -- docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/tasks-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md .agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- Parent implementation lane:
  - before `npm run docs:freshness`
  - before `npm run docs:freshness:maintain` when needed
  - classification artifact for the Mar 18 cohort
  - `node scripts/spec-guard.mjs --dry-run` when relevant
  - `npm run docs:check`
  - `npm run docs:freshness`
  - parent docs-review before implementation
  - parent standalone review or explicit fallback
  - parent elegance or minimality pass
- Rollback plan:
  - revert the parent-owned disposition changes if they hide CO-175 debt or rely on cap changes rather than explicit reviewed owner action

## Risks & Mitigations
- Risk: parent treats the Apr 18 blocker as a reason to widen rolling policy.
  - Mitigation: keep cap and window changes explicitly out of scope and require owner-action evidence for the Mar 18 cohort instead.
- Risk: parent silently bumps `last_review` across the Mar 18 cohort.
  - Mitigation: require class, path-family, and lineage classification before any review-date changes.
- Risk: CO-175 provenance becomes less visible after the Apr 18 repair.
  - Mitigation: keep the `221` rolling rows and CO-175 ownership explicit in the packet and the parent-owned cohort-guide update.
- Risk: this child packet overstates what is complete.
  - Mitigation: mark all parent-owned implementation and validation items as pending in the checklist mirrors.

## Approvals
- Docs packet child lane: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation, validation, and PR lifecycle: pending parent lane
