# ACTION_PLAN - CO: capture live Linear request-burn telemetry after webhook-first targeted reconcile rollout
## Summary
- Goal: close `CO-147` with a live telemetry packet and an evidence-backed quota verdict on top of shipped `CO-144`, without reopening intake design.
- Scope: docs-first packet, one active workpad, shared-root telemetry capture, fresh live query-mode samples, validation, and normal review/handoff steps if repo-tracked diffs remain.
- Assumptions: the local control-host is already running on post-`CO-144` mainline behavior and the current CO-147 worker proof remains readable under the shared-root artifact tree.
## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `webhook-first targeted reconcile`, `slow full recovery sweeps`, `dispatch_source_tracked_issues:recovery_sweep`, and `dispatch_source_tracked_issues:fresh_discovery`; reject CO-144 redesign, quota-request-now, or deterministic-proof-only interpretations.
- Not done if: the packet lacks live shared-budget attribution, does not separate `recovery_sweep` from `fresh_discovery`, or omits the sufficiency verdict.
- Pre-implementation issue-quality review: the issue is already narrower than a design lane; current live host/provider artifacts expose the right telemetry surface, so the remaining work is evidence capture and truthful closeout.
## Milestones & Sequencing
1. Draft/register the CO-147 packet, mirror the checklist, and upsert the single workpad comment from a local `out/.../manual/workpad.md` source.
2. Capture shared-root control-host state, active CO-147 provider proof, and fresh live `fresh_discovery` / `recovery_sweep` samples into `out/linear-7105185a-05da-4f49-89d9-35efbba38f3c/manual/`.
3. Record the quota verdict, run docs-review plus the relevant docs validation floor, and refresh the workpad with the finished evidence status.
## Dependencies
- Shared-root control-host state under `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/`
- Active CO-147 provider run under `/Users/kbediako/Code/CO/.runs/linear-7105185a-05da-4f49-89d9-35efbba38f3c/cli/`
- Working Linear credentials already configured for the local host/worker path
## Validation
- Checks / tests: `linear child-stream --pipeline docs-review`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`
- Rollback plan: revert only the docs packet and local evidence artifacts; no product behavior changes are introduced in this lane.
## Risks & Mitigations
- Risk: later queries could consume extra request budget without improving evidence.
- Mitigation: use one bounded fresh sample per query mode and rely on the persisted shared-budget snapshot for the rest of the packet.
- Risk: endpoint-specific request remaining counts are not persisted separately.
- Mitigation: use shared-bucket headroom plus per-endpoint `request_complexity`, observation timestamps, and exact aliases instead of inventing non-existent counters.
