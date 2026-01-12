# Action Plan - Delegation NPM Release Plan (Task 0942)

## Status Snapshot
- Current Phase: Patch release prep (framing fix in progress)
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`
- Approvals / Escalations: PRD approved; 0.1.5 tag/publish pending.

## Milestones & Tasks
1. Release delta audit
   - Compare npm 0.1.4 behavior vs main (delegation MCP handshake).
   - Confirm JSONL framing mismatch causes handshake timeout.
   - Review pack audit allowlist for delegation/runtime assets.
2. Release preparation
   - Decide version bump and tag strategy (approved: 0.1.5, no prerelease).
   - Draft release notes/changelog for framing compatibility fix.
   - Confirm release gate sequence per `.agent/SOPs/release.md`.
3. Implementation + validation
   - Implement JSONL framing support in delegation MCP server.
   - Add/adjust unit tests for JSONL framing.
4. Release execution
   - Update version, tag, and run release SOP gate.
   - Monitor GitHub release workflow and publish comms.

## Changelog Draft (for release notes)
- Fixed delegation MCP server to accept JSONL framing from Codex CLI, preventing handshake timeouts.
- Preserved existing delegation tool surface and confirm-to-act behavior.

## Risks & Mitigations
- Risk: Tag/version mismatch blocks release workflow.
  - Mitigation: validate version before tagging.
- Risk: Pack audit fails due to new dist paths.
  - Mitigation: run `npm run pack:audit` + `npm run pack:smoke` pre-tag.
- Risk: JSONL parsing could mis-handle partial frames.
  - Mitigation: unit tests for split/combined frames; maintain size caps and invalid JSON recovery.
- Risk: Users unaware of config gating.
  - Mitigation: highlight config flags + opt-in behavior in release notes.

## Comms Plan
- Announce in release notes + README snippet (follow-up task).
- Notify internal consumers about new delegation opt-in flags and confirm-to-act behavior.

## Next Review
- Date: 2026-01-13
- Agenda: patch release status + comms follow-through.
