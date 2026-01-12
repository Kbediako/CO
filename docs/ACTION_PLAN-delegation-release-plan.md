# Action Plan - Delegation NPM Release Plan (Task 0942)

## Status Snapshot
- Current Phase: Release published (tag + workflow complete)
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`
- Approvals / Escalations: Release workflow succeeded (https://github.com/Kbediako/CO/actions/runs/20908106047)

## Milestones & Tasks
1. Release delta audit
   - Compare `package.json` on main vs npm 0.1.3.
   - Confirm delegation features are absent from the 0.1.3 tarball.
   - Review pack audit allowlist for delegation/runtime assets.
2. Release preparation
   - Decide version bump and tag strategy (approved: 0.1.4, no prerelease).
   - Draft release notes/changelog for delegation features and new dependencies.
   - Confirm release gate sequence per `.agent/SOPs/release.md`.
3. Release execution
   - Update version, tag, and run release SOP gate.
   - Monitor GitHub release workflow and publish comms.

## Changelog Draft (for release notes)
- Added delegation MCP server (delegate.spawn/pause/cancel/status + question queue).
- Added confirm-to-act enforcement with runner-injected nonces and validation.
- Added delegation config parsing + canonicalized confirmation payloads.
- Added dependencies `@iarna/toml` and `canonicalize`.

## Risks & Mitigations
- Risk: Tag/version mismatch blocks release workflow.
  - Mitigation: validate version before tagging.
- Risk: Pack audit fails due to new dist paths.
  - Mitigation: run `npm run pack:audit` + `npm run pack:smoke` pre-tag.
- Risk: Users unaware of new config gating.
  - Mitigation: highlight config flags + opt-in behavior in release notes.

## Comms Plan
- Announce in release notes + README snippet (follow-up task).
- Notify internal consumers about new delegation opt-in flags and confirm-to-act behavior.

## Next Review
- Date: 2026-01-13
- Agenda: post-release verification + comms follow-through.
