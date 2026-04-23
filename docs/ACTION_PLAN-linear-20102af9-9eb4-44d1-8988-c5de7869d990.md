# ACTION_PLAN - CO-298 stale control-host supervision status truth versus healthy live host truth

## Added by Docs Child Lane 2026-04-22

## Summary
- Goal: give the parent lane a bounded implementation plan for stale `control-host supervise status --format json` launchd/state truth versus healthy current live host truth.
- Scope: docs-first packet, current source audit, bounded status-surface repair, focused supervision-status validation, and normal parent-owned review handoff.
- Assumptions:
  - the smallest repair stays inside supervision status composition rather than broad launchd workflow changes
  - `co-status --format json` and `provider-intake-state.json` remain the relevant live-host truth surfaces

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `control-host supervise status --format json`, `service.loaded`, `status=restart_required`, `last_health_status=probe_timeout`, `co-status --format json`, `provider-intake-state.json`, stale launchd/state truth, and healthy live host truth.
- Not done if: stale persisted supervision residue still overrides newer healthy live host truth, `service.loaded` is still misread as the whole health verdict, or genuine current `restart_required` / `probe_timeout` truth is hidden.
- Pre-implementation issue-quality review: approved. The live seam is status-surface truthfulness across launchd, persisted supervision state, and live-host evidence, not a broader launchd or provider workflow redesign.

## Milestones & Sequencing
1. Create the `CO-298` docs packet, checklist mirrors, task snapshot, and freshness registry entries inside the declared docs-only scope.
2. Reconfirm the parent-owned source seam in `controlHostSupervisionCliShell.ts`: status rendering currently reads `launchctl`, the persisted state file, and the LaunchAgent plist, while live health probing is separate.
3. Implement the smallest bounded repair so `control-host supervise status --format json` can distinguish stale persisted supervision residue from healthy current live host truth.
4. Add focused regression coverage for stale persisted `status=restart_required` / `last_health_status=probe_timeout` versus healthy current live host truth, while preserving genuine current unhealthy cases.
5. Run parent-owned docs-review and focused validation, then close out with issue/workpad/PR handling in the authoritative lane.

## Dependencies
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/src/cli/control/controlHostSupervision.ts`
- `orchestrator/src/cli/control/providerControlHostFreshnessGauge.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`
- `docs/public/provider-onboarding.md`

## Validation
- Child-lane checks:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`
  - `rg -n "control-host supervise status --format json|service.loaded|status=restart_required|last_health_status=probe_timeout|co-status --format json|provider-intake-state.json|stale launchd/state truth|healthy live host truth|controlHostSupervisionCliShell.ts|controlHostSupervision.ts|ControlHostSupervision.test.ts|providerControlHostFreshnessGauge.ts" docs/PRD-linear-20102af9-9eb4-44d1-8988-c5de7869d990.md tasks/specs/linear-20102af9-9eb4-44d1-8988-c5de7869d990.md docs/ACTION_PLAN-linear-20102af9-9eb4-44d1-8988-c5de7869d990.md tasks/tasks-linear-20102af9-9eb4-44d1-8988-c5de7869d990.md .agent/task/linear-20102af9-9eb4-44d1-8988-c5de7869d990.md`
  - `git diff --check -- docs/PRD-linear-20102af9-9eb4-44d1-8988-c5de7869d990.md tasks/specs/linear-20102af9-9eb4-44d1-8988-c5de7869d990.md docs/ACTION_PLAN-linear-20102af9-9eb4-44d1-8988-c5de7869d990.md tasks/tasks-linear-20102af9-9eb4-44d1-8988-c5de7869d990.md .agent/task/linear-20102af9-9eb4-44d1-8988-c5de7869d990.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused `orchestrator/tests/ControlHostSupervision.test.ts`
  - parent-owned source or live evidence comparing `control-host supervise status --format json`, `co-status --format json`, and `provider-intake-state.json`
  - parent docs-review before implementation
- Rollback plan:
  - revert any change that suppresses genuine unhealthy live-host truth, broadens into launchd redesign, or discards historical supervision-state evidence

## Risks & Mitigations
- Risk: the parent treats `service.loaded` as equivalent to current live-host health.
  - Mitigation: keep launchd truth explicit but separate from current live-health classification.
- Risk: the parent fixes the issue by deleting or overwriting persisted supervision state.
  - Mitigation: preserve historical supervision-state evidence and add bounded classification instead.
- Risk: the repair suppresses genuine current `restart_required` or `probe_timeout` truth.
  - Mitigation: focused tests must keep current unhealthy truth visible while only reclassifying stale residue.

## Approvals
- Reviewer: pending parent docs-review / implementation handoff.
- Date: 2026-04-22
