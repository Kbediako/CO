# ACTION_PLAN - Control host: stale plain released/not_active Blocked claim can still strand refresh at refresh:rehydrated and starve Ready admission

## Summary
- Goal: give the parent lane a bounded plan to reproduce the `refresh:rehydrated` starvation seam, prove whether stale plain `released/not_active` retained claims can wedge the refresh lifecycle, and restore normal `Ready` admission without manual launch or broad restart.
- Scope: parent-owned incident replay, narrow lifecycle/reclaim diagnosis, focused fix, and focused regression or durable diagnostic coverage.
- Assumptions:
  - the issue body and current issue-context cache already preserve the exact checksum terms and adjacent-lane boundaries
  - the shared `source-0` payload is metadata-only, not the substantive issue body
  - the narrowest correct answer is a lifecycle-progress or retained-claim recovery fix, not a generic restart-policy rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - control-host refresh lifecycle
  - `refresh:rehydrated`
  - `provider_refresh_lifecycle_stuck`
  - stale plain `released/not_active` claim
  - cached `Blocked` issue truth
  - Ready admission starvation
  - `POST /api/v1/refresh`
  - `claims_scanned=0`
  - `fresh_discovery_runs=0`
  - `CO-233`
  - `CO-202`
  - `CO-212`
  - `CO-238`
  - `CO-41`
  - `CO-211`
- Not done if:
  - refresh can still sit at `refresh:rehydrated` with zero claim scanning and zero fresh discovery while live dispatch recommends a `Ready` issue
  - the parent fix becomes reclaim-only and never explains the lifecycle wedge
  - the parent answer depends on `manual-launch` or broad restart as the normal recovery path
  - the lane drifts into `CO-212`, `CO-238`, or generic restart-policy redesign
- Pre-implementation issue-quality review:
  - accepted framing is lifecycle-stuck starvation proven by a successful refresh POST that never advances beyond `refresh:rehydrated`
  - rejected framings are reclaim-only, `CO-212`, `CO-238`, `manual-launch`, and broad-restart reinterpretations

## Milestones & Sequencing
1. Parent replays the incident bundle under `out/co-233-admission-nudge-20260418T124529Z/` and reproduces or simulates the exact `refresh:rehydrated`, `claims_scanned=0`, `fresh_discovery_runs=0`, `provider_refresh_lifecycle_stuck` shape.
2. Parent proves whether the stale plain `released/not_active` retained claim with cached `Blocked` truth wedges the lifecycle directly or whether a fail-closed lifecycle latch stops progress before claim scanning begins.
3. Parent implements the narrowest lifecycle-progress or retained-claim recovery change that lets refresh advance and re-admit the `Ready` issue without broad restart.
4. Parent adds focused regression coverage or durable diagnostics proving the difference between reclaim suppression and lifecycle-stuck starvation while preserving adjacent issue-state modeling.

## Dependencies
- Shared source 0 anchor: `ctx:sha256:90f181707d191588a350b88e2378b3a174ef9814ccc956d90dd6d782f7c437a9#chunk:c000001`
- Source payload note: metadata-only source payload at `.runs/linear-5f2ebb52-e5f5-4367-84e2-4039ba031b26-docs-packet/cli/2026-04-18T13-17-17-407Z-341c0733/memory/source-0/source.txt`
- Current issue-context cache: `.runs/linear-5f2ebb52-e5f5-4367-84e2-4039ba031b26/cli/2026-04-18T13-10-39-584Z-a63bc089/provider-linear-issue-context-cache.json`
- Incident bundle root: `out/co-233-admission-nudge-20260418T124529Z/`
- Core bundle files:
  - `00-before-issue-context.json`
  - `01-before-dispatch.json`
  - `02-before-state.json`
  - `03-before-claim.json`
  - `04-refresh-ack.json`
  - `poll-06.json`
  - `99-summary.json`

## Validation
- Checks / tests:
  - child lane only: `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - child lane only: protected-term grep across packet and mirror files
  - child lane only: `git diff --check --` on touched files
  - parent only: focused reproduction/regression for the `refresh:rehydrated` starvation shape
  - parent only: focused adjacent regression review for `CO-202`, `CO-212`, `CO-238`, `CO-41`, and `CO-211` if the chosen seam touches them
  - parent only: docs-review and required validation floor after source edits
- Rollback plan:
  - revert any lifecycle-progress change that weakens truthful `provider_refresh_lifecycle_stuck` / `restart_required` diagnostics or reintroduces unsafe reclaim behavior

## Risks & Mitigations
- Risk: the parent fix only clears stale reclaim suppression but leaves the lifecycle stuck before claim scanning.
  - Mitigation: require explicit proof that refresh advances beyond `refresh:rehydrated` and resumes claim scanning/discovery.
- Risk: the parent solution hides a genuine lifecycle stall by weakening fail-closed behavior.
  - Mitigation: keep `provider_refresh_lifecycle_stuck` / `restart_required` truth intact for genuine unhealthy states.
- Risk: the parent lane drifts into `manual-launch` or broad restart as the normal answer.
  - Mitigation: keep those interpretations explicitly rejected in the packet and parent validation criteria.

## Approvals
- Reviewer: pending parent implementation
- Date: 2026-04-18
