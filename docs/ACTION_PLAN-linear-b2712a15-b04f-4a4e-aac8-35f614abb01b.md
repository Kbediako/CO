# ACTION_PLAN - CO-315 release-runbook parity and docs:check truth coverage

## Added by Bootstrap 2026-04-23

## Summary
- Goal: close `CO-315` by making the bundled release runbook truthful against the current release SOP/workflow and by making release-surface drift fail a normal `npm run docs:check`.
- Scope: docs-first packet in this child lane; parent-owned release-skill refresh, release-surface docs-hygiene coverage, focused validation, review, and PR lifecycle after import.
- Assumptions:
  - the authoritative current release truth already lives in `.agent/SOPs/release.md`, `docs/README.md`, `docs/release-notes-template-addendum.md`, and `.github/workflows/release.yml`
  - the gap is parity plus enforcement, not release workflow redesign
  - machine-checkable truth coverage is the required fix for future drift

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `skills/release/SKILL.md`
  - `.agent/SOPs/release.md`
  - `docs/release-notes-template-addendum.md`
  - `docs/README.md`
  - `.github/workflows/release.yml`
  - `docs:check`
  - validation floor
  - `RELEASE_SIGNING_PUBLIC_KEYS`
  - `RELEASE_SIGNING_ALLOWED_SIGNERS`
  - `workflow_dispatch`
  - `inputs.tag`
  - .github/release-overview.md
  - OIDC trusted publishing
  - `secrets.NPM_TOKEN`
  - `--provenance`
- Not done if:
  - maintainers still need hidden repo knowledge from workflow YAML or scattered docs to run a truthful release
  - release drift can still accumulate across the release skill/SOP/addendum without a normal `docs:check` failure
  - any protected acceptance seam is missing or contradictory
  - the parent broadens the lane into workflow redesign
- Pre-implementation issue-quality review:
  - 2026-04-23: this child-lane packet keeps the lane explicitly on release-runbook parity and machine-checkable `docs:check` truth coverage. The micro-task path is ineligible because correctness depends on exact protected release surfaces, exact wording, and parity/alignment enforcement rather than a tiny isolated doc tweak.

## Milestones & Sequencing
1. Draft the scoped docs/task files and register `CO-315` in `tasks/index.json`.
2. Parent refreshes `skills/release/SKILL.md` so it mirrors current release truth for the validation floor, signing posture, manual-dispatch semantics, overview override, and publish-auth posture.
3. Parent adds release-surface docs-catalog coverage and a targeted docs-hygiene release truth check for the release skill/SOP/addendum surfaces.
4. Parent adds focused validation proving `docs:check` fails on protected release drift instead of relying on reviewer memory.
5. Parent reruns docs-review/spec-guard plus the required validation/review gates before PR handoff.

## Dependencies
- `skills/release/SKILL.md`
- `.agent/SOPs/release.md`
- `docs/release-notes-template-addendum.md`
- `docs/README.md`
- `.github/workflows/release.yml`
- `docs/docs-catalog.json`
- `scripts/docs-hygiene.ts`
- parent-owned focused docs-hygiene coverage

## Validation
- Checks / tests:
  - child lane: scoped packet review only
  - parent lane: focused docs-hygiene/release-parity coverage
  - parent lane: `npm run docs:check`
  - parent lane: `npm run docs:freshness`
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: docs-review and required review/elegance gates before PR handoff
- Rollback plan:
  - revert the bounded release-surface truth-check and release-skill refresh together if the check proves too brittle or misclassifies truthful docs as drift
  - preserve the issue packet even if implementation rolls back, provided it remains truthful about the required parity contract

## Risks & Mitigations
- Risk: the parent solves the symptom by editing only one doc surface.
  - Mitigation: require `docs:check` coverage for release skill/SOP/addendum drift so parity stays enforceable.
- Risk: the parent broadens the lane into workflow redesign.
  - Mitigation: keep workflow behavior, dist-tag semantics, and publish policy explicitly out of scope.
- Risk: validation floor guidance stays partially stale because old release lore remains in the skill.
  - Mitigation: require the bundled release skill to mirror the current validation floor exactly and reject hidden repo knowledge.
- Risk: the truth check becomes a fragile string grep.
  - Mitigation: prefer a small normalized release-facts extractor or tightly bounded structural checks over ad hoc reviewer-only expectations.

## Approvals
- Reviewer: pending parent lane acceptance, docs-review, and implementation validation
- Date: 2026-04-23
