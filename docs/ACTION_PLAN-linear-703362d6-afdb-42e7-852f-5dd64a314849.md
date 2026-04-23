# ACTION PLAN - CO release after v0.1.38

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: ship the next public CO release from current main after `v0.1.38`.
- Scope: docs-first packet, semver and release-note evidence, release-prep branch diff, full validation/review, PR merge, signed tag, GitHub release, npm publish, and closeout evidence.
- Assumptions: GitHub CLI access, npm publish permissions, and local signing configuration remain usable on this machine.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-316`, `v0.1.38`, `package.json`, `origin/main`, `.agent/SOPs/release.md`, `.github/workflows/release.yml`, `0.123.0`, GitHub release, npm publish, bundled skill refresh guidance.
- Not done if: the lane ships a patch-style release without justification, cuts from non-`main`, skips required validation/review, or omits downstream guidance.
- Pre-implementation issue-quality review: approved on 2026-04-24 after current-main audit confirmed this is a large release ship lane with already-promoted `0.123.0` posture truth, not another posture-decision issue.

## Milestones & Sequencing
1. Finalize docs-first packet and release-delta evidence, including same-turn child-lane closeout.
2. Prepare parent-owned release diff on `linear/co-316-release-prep`: semver bump, release notes, and any required docs/task mirror updates.
3. Run the full release validation floor, then standalone review and explicit elegance pass.
4. Open/update the release PR, address feedback, run `pr ready-review`, and merge after clean quiet window.
5. From clean shared-root `main`, create and verify signed tag, push it, watch the release workflow, and confirm GitHub release + npm publish success.
6. Refresh the workpad with final evidence and close the issue only after shared-root reconciliation is recorded.

## Dependencies
- `.agent/SOPs/release.md`
- `.github/workflows/release.yml`
- `docs/skills-release.md`
- current `0.123.0` posture already landed on `main`
- authenticated `gh` and publish-capable npm environment

## Validation
- Checks / tests:
  - release floor from `.agent/SOPs/release.md`
  - `codex-orchestrator pr ready-review --pr <number> --quiet-minutes 15`
  - local tag verification (`git tag -v`)
  - workflow terminal success for GitHub release + npm publish
- Rollback plan:
  - stop on any failing required gate and fix before merge/tag
  - if tag/publish fails, do not mark done; repair the failing prerequisite and rerun from clean `main`

## Risks & Mitigations
- Risk: the release is understated as a patch despite a large unreleased delta.
- Mitigation: require explicit semver justification and release-delta summary before version bump is finalized.
- Risk: release notes drift from current-main truth.
- Mitigation: use git/history evidence plus current public policy/docs as the source of truth, not the older issue body alone.
- Risk: release is cut from the wrong checkout.
- Mitigation: keep prep and publish as separate phases and record shared-root clean-main evidence before tag/publish.
- Risk: downstream users miss bundled-skill refresh implications.
- Mitigation: include explicit install/refresh wording and link `docs/skills-release.md` when relevant.
