# ACTION_PLAN - CO-330 stale control-host owner reclaim and provider refresh retry recovery

## Summary
- Goal: create the CO-330 docs-first packet and task registration for stale control-host owner recovery.
- Scope: packet files, task mirrors, and `tasks/index.json` only.
- Assumptions:
  - the parent prompt carries the authoritative issue shape for this child lane
  - the parent workspace source-0 payload is present and records provider-worker run metadata/provenance for this CO-330 attempt
  - parent owns implementation/source files, tests, Linear state, workpad, PR lifecycle, and full validation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `stale_control_host_owner`
  - `control-host`
  - `provider-linear-worker could not request control-host refresh`
  - `refresh request timeout`
  - `fetch failed`
  - `control-host-stale-owner.json`
  - `provider-control-host-refresh-failure.json`
  - `owner reclaim`
  - `provider refresh`
  - `retry/resumable queue behavior`
- Not done if:
  - stale owner failures remain indistinguishable from generic `fetch failed` or refresh timeout noise
  - no `control-host-stale-owner.json` artifact is planned
  - no `provider-control-host-refresh-failure.json` artifact is planned for unrecovered retry failures
  - owner reclaim can touch an active owner or run without liveness evidence
  - provider refresh queue state is lost or falsely terminal during reclaim
  - the lane is reframed as CO-41, CO-317-only, generic restart, or stdin bootstrap work
- Pre-implementation issue-quality review:
  - 2026-04-23: bounded docs child lane confirms the issue is broader than a generic host restart and narrower than a full duplicate-host or provider queue redesign.
  - 2026-04-23: micro-task path is not appropriate because correctness depends on exact protected terms, rejected interpretations, and the CO-152 / CO-119 context boundary.

## Milestones & Sequencing
1. Record source anchor and source payload availability.
2. Create the CO-330 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
3. Register the canonical spec and checklist in `tasks/index.json`.
4. Validate `tasks/index.json` parses.
5. Review scoped git status/diff for declared-file-only changes.
6. Leave changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Parent reconciles the source-0 payload in the authoritative issue workspace.
2. Parent runs docs-review for the CO-330 packet.
3. Parent implements stale-owner classification and ownership diagnostic capture.
4. Parent writes `provider-control-host-refresh-failure.json` when stale-owner reclaim + retry does not recover.
5. Parent implements safe metadata-first owner reclaim that refuses active owners.
6. Parent hardens provider refresh retry/resumable queue behavior after reclaim.
7. Parent adds focused tests and runs normal parent-owned validation.

## Dependencies
- Linear issue `CO-330`
- Source anchor `ctx:sha256:dd72505af8602844d9a722f7d0cac31d98fe08f25d84adb745ed3f979b6c8cf8#chunk:c000001`
- Prior context: `CO-152` stale-owner ownership and `CO-119` refresh-timeout recovery
- `tasks/index.json`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks index json ok')"`
  - `git diff --name-only`
  - `git status --short`
- Rollback plan:
  - revert only the CO-330 docs packet and `tasks/index.json` row if parent source reconciliation changes the issue shape before implementation

## Risks & Mitigations
- Risk: source-0 payload is mistaken for the full issue contract.
  - Mitigation: packet records that source-0 is run metadata/provenance while Linear issue text remains the requirements source.
- Risk: stale-owner recovery is mistaken for generic restart guidance.
  - Mitigation: PRD/spec/checklists explicitly reject host restart as the durable fix.
- Risk: reclaim path weakens active-owner safety.
  - Mitigation: parent implementation must prove metadata-first liveness checks and active-owner fail-closed behavior.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-23
- Parent docs-review / implementation approval: pending
