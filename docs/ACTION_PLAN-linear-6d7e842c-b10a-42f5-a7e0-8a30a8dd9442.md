# ACTION_PLAN - CO-468 control-host accepted no-run pending revalidation recovery

## Summary
- Goal: prepare CO-468 implementation so `control-host recovery/nudge/relaunch` can handle a Ready issue with accepted/pending revalidation residue, `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest while WIP is below cap.
- Scope: docs-first packet, registry mirrors, and parent-owned implementation sequencing.
- Assumptions: the child prompt and source anchor are authoritative for this bounded docs lane; parent will refresh live `issue-context` before state mutation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `control-host recovery/nudge/relaunch`
  - `accepted/pending revalidation`
  - `Ready issue`
  - `run_id=null`
  - `launch_token=null`
  - `run_manifest_path=null`
  - `no manifest`
  - `WIP below cap`
  - `25s CLI recovery timeout`
  - `CO-404/CO-406 done family`
  - `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`
- Not done if:
  - the Ready issue remains stuck behind accepted/no-run pending revalidation residue
  - no-run accepted claims are made to consume WIP
  - the fix is routed as `CO-455 attach timeout with healthy manifests`
  - the fix is routed as `CO-459 stale provider_intake projection`
  - the fix is routed as `CO-453 child-lane tracker drift`
  - CO-404 or CO-406 are reopened instead of preserved as done-family references
- Pre-implementation issue-quality review:
  - 2026-05-01: this is a recovery-path issue that composes the CO-404 timeout boundary and CO-406 accepted/no-run non-WIP boundary. It is not an attach-timeout healthy-manifest issue, projection-staleness issue, child-lane tracker issue, or WIP-accounting reversal.
- Fallback / refactor decision:
  - This task touches stale/recovery residue and timeout behavior. Remove the no-run accepted pending-revalidation recovery gap. Retain accepted/no-run audit state only as non-WIP truth. Retain the 25s recovery timeout as a supported operator safety contract.
- Durable retention evidence:
  - accepted/no-run pending revalidation remains auditable provider-intake state only when non-WIP
  - 25s timeout remains a supported CLI recovery contract
- Large-refactor check:
  - parent should implement narrowly if one classifier can drive recovery, relaunch, nudge, and validation truth; escalate only if source inspection finds incompatible duplicated authorities

## Milestones & Sequencing
1. Parent accepts the docs patch and reruns live `issue-context` for CO-468 before implementation.
2. Parent confirms CO-468 is still a Ready issue or records any live-state divergence before proceeding.
3. Parent inspects `control-host recover`, `control-host relaunch`, and `control-host nudge` paths plus provider-intake claim handling.
4. Parent adds or reuses a classifier for accepted/pending revalidation with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest.
5. Parent ensures WIP below cap remains truthful and no-run accepted claims do not consume WIP.
6. Parent preserves the 25s CLI recovery timeout as an actionable recovery result.
7. Parent adds focused regressions for recovery/nudge/relaunch and boundary regressions or no-touch proof for CO-404 and CO-406.
8. Parent runs docs-review, implementation validation, standalone review, elegance pass, PR checks, feedback cleanup, ready-review drain, and Linear handoff.

## Dependencies
- Live Linear issue truth for CO-468
- `provider-intake-state.json`
- `control-host recover`
- `control-host relaunch`
- `control-host nudge`
- `controlHostProviderWorkerRecoverCliShell.ts`
- `providerIssueHandoff.ts`
- `co-status --format json`
- `/ui/data.json`
- CO-404 timeout acknowledgement behavior
- CO-406 accepted/no-run WIP behavior

## Validation
- Child lane:
  - protected-term grep over the packet files
  - JSON parse for touched registries
  - `git diff --check` over declared touched files
- Parent lane:
  - docs-review before implementation
  - focused recovery/nudge/relaunch test for Ready issue plus accepted/pending revalidation no-run residue
  - WIP below cap test proving no-run accepted claims do not consume WIP
  - timeout test proving `25s CLI recovery timeout` remains actionable
  - boundary evidence rejecting CO-455, CO-459, and CO-453 interpretations
  - full required implementation/review gates selected by parent

## Risks & Mitigations
- Risk: parent treats accepted state alone as occupancy.
  - Mitigation: acceptance explicitly requires no-run accepted claims not consume WIP.
- Risk: parent absorbs CO-455, CO-459, or CO-453.
  - Mitigation: packet names those wrong interpretations and keeps them out of the milestones.
- Risk: recovery timeout hides the missing-manifest shape.
  - Mitigation: parent validation must preserve `25s CLI recovery timeout` while surfacing no run id/token/manifest evidence.
- Risk: CO-404 or CO-406 are reopened.
  - Mitigation: packet treats them as done-family references and requires no-touch or boundary regression evidence.

## Approvals
- Reviewer: CO-468 provider worker
- Date: 2026-05-01
