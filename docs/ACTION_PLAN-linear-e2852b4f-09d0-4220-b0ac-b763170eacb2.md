# ACTION_PLAN - CO-314 release notes Overview/Bug Fixes parity and prerelease docs truth

## Added by Docs Child Lane 2026-04-23

## Summary
- Goal: give the parent lane a bounded implementation plan for release-note `Overview` / `Bug Fixes` promotion, prerelease `dist-tag` docs truth, and stale-safe overview override handling.
- Scope: docs-first packet, current release-surface audit, parent-owned release-note generation/docs parity implementation, focused validation, and normal parent-owned review handoff.
- Assumptions:
  - the smallest implementation seam is the release-note generation block in `.github/workflows/release.yml` plus docs parity updates
  - `.github/release.yml` remains the generated release-note category source truth
  - `docs/README.md` and `.agent/SOPs/release.md` should describe the workflow behavior, not a simplified alpha-only prerelease path

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `docs/release-notes-template-addendum.md`, `.github/workflows/release.yml`, .github/release-overview.md, `docs/README.md`, `.agent/SOPs/release.md`, `Overview`, `Bug Fixes`, `Full Changelog`, and prerelease `dist-tag` derivation.
- Not done if: promoted `Bug Fixes` content can duplicate in `Full Changelog`, docs still describe prerelease publishing as alpha-only, .github/release-overview.md can shape release notes, `.agent/SOPs/release.md` loses the `.github/workflows/release.yml` reference, or checklist evidence does not split initial diff-budget from final review-wrapper rerun.
- Pre-implementation issue-quality review: approved. The lane is release-note/docs parity work for `CO-314`, not release publication, package versioning, signing policy, or broad release workflow redesign.

## Milestones & Sequencing
1. Create the `CO-314` docs packet, checklist mirrors, task snapshot, and freshness registry entries inside the declared docs-only scope.
2. Parent confirms the current source audit: `.github/workflows/release.yml` derives prerelease `DIST_TAG`, promotes generated `Overview` and `Bug Fixes`, strips `Overview`, and writes `Full Changelog`; .github/release-overview.md is optional and absent in this checkout.
3. Parent implements the smallest release-note generation fix so promoted `Overview` and `Bug Fixes` appear once and `Full Changelog` keeps only non-promoted generated content plus compare metadata.
4. Parent updates `docs/README.md`, `.agent/SOPs/release.md`, and any required addendum wording so prerelease `dist-tag` derivation and signed annotated tag body overview override handling match `.github/workflows/release.yml`.
5. Parent records checklist evidence that explicitly names `Overview` / `Bug Fixes`, captures initial diff-budget evidence, and separately captures final review-wrapper rerun evidence after implementation/review changes.
6. Parent runs focused validation and review gates, then handles Linear/workpad/PR lifecycle in the authoritative lane.

## Dependencies
- `.github/workflows/release.yml`
- `.github/release.yml`
- .github/release-overview.md
- `docs/release-notes-template-addendum.md`
- `docs/README.md`
- `.agent/SOPs/release.md`
- PR `#608` review notes carried by the parent lane

## Validation
- Child-lane checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`
  - `rg -n "Overview|Bug Fixes|Full Changelog|prerelease \`dist-tag\` derivation|docs/release-notes-template-addendum.md|\\.github/workflows/release.yml|release-overview\.md|docs/README.md|\\.agent/SOPs/release.md|initial diff-budget|final review-wrapper" docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md .agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
  - `git diff --check -- docs/PRD-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md .agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md tasks/index.json docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused release-note generation validation for `Overview`, `Bug Fixes`, and `Full Changelog`
  - focused docs parity check across `.github/workflows/release.yml`, `docs/README.md`, and `.agent/SOPs/release.md`
  - docs-review before implementation
  - diff-budget evidence before review handoff
  - final review-wrapper rerun after implementation and review feedback
- Rollback plan:
  - revert any change that duplicates promoted release-note content, misdocuments prerelease `DIST_TAG`, lets .github/release-overview.md shape release notes, or broadens into release publication/signing/package policy

## Risks & Mitigations
- Risk: the parent fixes `Overview` promotion but leaves `Bug Fixes` duplicated in `Full Changelog`.
  - Mitigation: acceptance criteria and checklist items explicitly name both `Overview` and `Bug Fixes`.
- Risk: release docs keep saying prerelease publishing is alpha-only.
  - Mitigation: document workflow-derived prerelease `DIST_TAG` behavior with alpha as an example and `next` as fallback.
- Risk: .github/release-overview.md persists across releases and silently overrides future notes.
  - Mitigation: remove workflow reads of that committed file and document the signed annotated tag body as the one-shot override.
- Risk: review evidence is hard to audit.
  - Mitigation: separate initial diff-budget evidence from final review-wrapper rerun evidence in the checklist mirrors.

## Approvals
- Reviewer: pending parent docs-review / implementation handoff.
- Date: 2026-04-23
