# ACTION PLAN - CO docs/skills-release post-0.121 marketplace command alignment

## Summary
- Goal: complete CO-339 by aligning `docs/skills-release.md` with the post-CO-337 marketplace command transition and current workflow-pin truth.
- Scope: docs-first packet, registry mirrors, `docs/skills-release.md`, targeted validation, and review handoff.
- Assumptions: current `origin/main` is the source of truth for workflow pins, and CO-337 already owns the broader command-surface audit.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs/skills-release.md`
  - Codex CLI `0.121.0`
  - Codex CLI `0.122.0`
  - Codex CLI `0.123.0`
  - `codex marketplace add`
  - `codex plugin marketplace add`
  - `pack:smoke`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
- Not done if:
  - `docs/skills-release.md` lacks the 0.121 both-path and 0.122+ plugin-path command transition
  - release-facing workflow wording still claims `@openai/codex@0.121.0`
  - `cloud-canary` is not kept distinct from release-facing `pack:smoke`
- Pre-implementation issue-quality review:
  - approved for docs-first packet plus parent-owned docs implementation. The lane is a parity/alignment fix whose correctness depends on exact command names and workflow surfaces, so the micro-task path is not used.

## Milestones & Sequencing
1. Create CO-339 PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Run docs-review before editing `docs/skills-release.md`, or record a bounded fallback if the review wrapper is unavailable.
4. Patch `docs/skills-release.md` with the command transition, release-facing pin truth, and distinct `cloud-canary` note.
5. Run targeted grep checks plus repo docs/spec validation.
6. Run standalone review and explicit elegance review before review handoff.
7. Refresh the Linear workpad with final evidence.

## Dependencies
- CO-337 current-main evidence in `docs/guides/codex-version-policy.md`
- current workflow files:
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`

## Validation
- Checks / tests:
  - docs-review child stream or explicit fallback
  - targeted `rg` checks for the command transition and stale claims
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - standalone review and explicit elegance review
- Rollback plan:
  - revert the `docs/skills-release.md` wording and packet registration if the current-main workflow evidence changes before handoff

## Risks & Mitigations
- Risk: the doc overstates marketplace support by omitting the version boundary.
  - Mitigation: state `0.121.0` and `0.122.0+` behavior explicitly.
- Risk: release-facing smoke and cloud canary are conflated because both currently pin `0.123.0`.
  - Mitigation: keep the workflow lists and rationale separate in `docs/skills-release.md`.
- Risk: this lane reopens CO-337.
  - Mitigation: limit implementation to the release guide and packet mirrors.

## Approvals
- Docs-first packet: parent-owned.
- Implementation / validation: complete; PR lifecycle pending.
- Date: 2026-04-24
