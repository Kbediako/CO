# ACTION_PLAN - CO-330 reopened stale-owner/provider-refresh recurrence after PR #624

## Summary
- Goal: complete the reopened 2026-04-24/2026-04-25 stale-owner/provider-refresh recurrence after PR #624.
- Scope: CO-330 packet/checklist files, control-host supervision restart classification, and focused supervision regression coverage.
- Assumptions:
  - the parent prompt carries the authoritative issue shape for this bounded child lane
  - source 0 is the parent-provided recurrence anchor for provider-worker evidence and provenance
  - the child lane refreshed docs only; parent owns implementation/source files, tests, Linear state, workpad, PR lifecycle, and full validation
  - parent owns `tasks/index.json` and docs-freshness registry updates if the recurrence packet requires them

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `stale_control_host_owner`
  - `stale_reclaimed`
  - `control-host`
  - `provider-linear-worker could not request control-host refresh`
  - `refresh request timeout`
  - `fetch failed`
  - `control-host-stale-owner.json`
  - `provider-control-host-refresh-failure.json`
  - `owner pid/host/task/run`
  - `attempted pid/host`
  - `co-status freshness`
  - `owner reclaim`
  - `provider refresh`
  - `retry/resumable queue behavior`
  - `PR #624`
  - `CO-351`
  - `CO-352`
  - `CO-355`
- Not done if:
  - stale owner failures remain indistinguishable from generic `fetch failed` or refresh timeout noise
  - `stale_reclaimed` is treated as recovery success without verified `co-status freshness`
  - no `control-host-stale-owner.json` artifact is planned
  - `control-host-stale-owner.json` omits `owner pid/host/task/run` or `attempted pid/host`
  - no `provider-control-host-refresh-failure.json` artifact is planned for unrecovered retry failures
  - owner reclaim can touch an active owner or run without liveness evidence
  - provider refresh queue state is lost or falsely terminal during reclaim
  - validation does not cover the `CO-351` / `CO-352` / `CO-355` recurrence shape
  - the lane is reframed as CO-41, CO-317-only, generic restart, or stdin bootstrap work
- Pre-implementation issue-quality review:
  - 2026-04-25: bounded recurrence docs child lane confirms the reopened issue is broader than PR #624's single retry and narrower than a full duplicate-host or provider queue redesign.
  - 2026-04-25: micro-task path is not appropriate because correctness depends on exact protected terms, rejected interpretations, recurrence provenance, and the CO-152 / CO-119 / PR #624 boundary.

## Milestones & Sequencing
1. Record the 2026-04-25 source anchor and parent manifest pointer.
2. Refresh the CO-330 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror for the recurrence.
3. Preserve protected terms, rejected interpretations, and acceptance criteria from the Linear issue.
4. Reproduce/explain why PR #624's single provider refresh retry did not stop the recurrence.
5. Patch control-host supervision so one fail-closed timeout restart is allowed, then repeated same-worker `probe_timeout` churn is quarantined, while provider refresh remains active before `restart_required`.
6. Add focused coverage for the `CO-351` / `CO-352` / `CO-355` active worker series.
7. Run parent validation, standalone review, and PR handoff gates.

## Parent-Owned Follow-On Plan
1. Parent reconciles source 0 and any Linear/workpad acceptance text in the authoritative issue workspace.
2. Parent runs docs-review for the refreshed CO-330 recurrence packet.
3. Parent implements recurrence-aware supervision quarantine for active provider refresh before `restart_required`.
4. Parent preserves existing `control-host-stale-owner.json` / `provider-control-host-refresh-failure.json` diagnostic contracts from PR #624.
5. Parent adds focused tests for `CO-351`, `CO-352`, and `CO-355` recurrence shapes and runs normal parent-owned validation.

## Dependencies
- Linear issue `CO-330`
- Source anchor `ctx:sha256:d14a6cd66c90db64bf91248f6f68d329bf0b540a68b4243aec21a6770b4dce3b#chunk:c000001`
- Prior context: `CO-152` stale-owner ownership, `CO-119` refresh-timeout recovery, and PR #624's single retry behavior
- Parent-owned `tasks/index.json` / docs-freshness registry if registration changes are required

## Validation
- Checks / tests:
  - `rg -n "stale_control_host_owner|stale_reclaimed|provider-control-host-refresh-failure.json|control-host-stale-owner.json|owner pid/host/task/run|attempted pid/host|co-status freshness|CO-351|CO-352|CO-355" <packet files>`
  - `npm test -- --run orchestrator/tests/ControlHostSupervision.test.ts`
  - `git diff --name-only`
  - `git status --short`
- Rollback plan:
  - revert only the six CO-330 packet/checklist files if parent source reconciliation changes the issue shape before implementation

## Risks & Mitigations
- Risk: source-0 payload is mistaken for the full issue contract.
  - Mitigation: packet records that source 0 is recurrence provenance, while Linear issue text remains the parent-owned requirements source.
- Risk: PR #624 is mistaken for proof that CO-330 is already complete.
  - Mitigation: packet explicitly states that the single retry was insufficient because provider workers still observed stale owner plus refresh failure and freshness still timed out/staled.
- Risk: stale-owner recovery is mistaken for generic restart guidance.
  - Mitigation: PRD/spec/checklists explicitly reject host restart as the durable fix.
- Risk: reclaim path weakens active-owner safety.
  - Mitigation: parent implementation must prove metadata-first liveness checks and active-owner fail-closed behavior.
- Risk: freshness remains stale after reclaim.
  - Mitigation: parent acceptance must include `co-status freshness` / control-host freshness success or explicit unrecovered failure artifacting.

## Approvals
- Docs-first packet refresh: bounded same-issue child lane, 2026-04-25; child patch applied by parent after helper invalidated acceptance on Linear timestamp staleness.
- Parent docs-review / implementation approval: pending.
