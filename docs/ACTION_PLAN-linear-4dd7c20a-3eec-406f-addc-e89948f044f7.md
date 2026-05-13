# ACTION_PLAN - CO: decide admission posture for unreadable foreign provider manifests
## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-149` / `4dd7c20a-3eec-406f-addc-e89948f044f7`
- Linear URL: https://linear.app/asabeko/issue/CO-149/co-decide-admission-posture-for-unreadable-foreign-provider-manifests

## Summary
- Goal: keep `CO-125`'s anti-wedge behavior for stale corrupt history while making live unreadable foreign workers count conservatively enough to prevent over-admission.
- Scope: docs-first packet, single workpad, same-turn parallelization decision, audited docs-review child stream, bounded provider admission implementation, focused regressions, validation, and review handoff.
- Assumptions:
  - the live bug is a discovery-truth gap for unreadable foreign manifests, not a missing shared-gate seam
  - an adjacent proof sidecar can provide bounded host-aware live-worker evidence without reopening broad manifest contracts, but only when a proof heartbeat TTL prevents stale proof-only inflation
  - the smallest correct fix lives in admission occupancy accounting rather than general provider run discovery

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `unreadable foreign provider manifests`
  - `shared admission gate`
  - `fail-open vs fail-closed occupancy`
  - `historical-manifest inflation`
  - `provider-linear-worker-proof.json`
- Not done if:
  - live unreadable foreign workers can still disappear from occupancy
  - stale corrupt history wedges the host again
  - coverage does not distinguish live unreadable occupancy from stale inflation
  - the lane broadens into generic status-truth work
- Pre-implementation issue-quality review:
  - completed during docs-first setup. Current code already proves the bounded seam: the shared admission gate counts discovered `in_progress` runs plus active claims, and unreadable manifests are skipped outright. That makes this lane narrower than `CO-125` and narrower than any generic status/denominator follow-up.

## Milestones & Sequencing
- [x] Register the docs-first packet for `linear-4dd7c20a-3eec-406f-addc-e89948f044f7`, create the single workpad source, switch the workspace onto `linear/co-149-unreadable-foreign-provider-manifests`, record the turn-level `linear parallelization` decision, and publish the initial workpad. Proof: `tasks/index.json`, `docs/TASKS.md`, `out/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/manual/workpad.md`.
- [x] Run `MCP_RUNNER_TASK_ID=linear-4dd7c20a-3eec-406f-addc-e89948f044f7 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-149-docs-review --format json` from the active workspace, then record the manifest-backed result or truthful fallback before implementation. Proof: `.runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7-co-149-docs-review/cli/2026-04-11T12-44-14-281Z-e269d6a8/manifest.json`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md` review notes.
- [x] Implement the bounded unreadable-manifest admission-only occupancy fallback in `orchestrator/src/cli/control/providerIssueHandoff.ts` without reopening unrelated admission, ownership, or status seams.
  - exact contract: proof-only unreadable occupancy counts only when the adjacent sidecar shows foreign `worker_host`, in-progress owner state, and a bounded heartbeat TTL (`updated_at`, else `attempt_started_at`) of `2 * PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS`
- [x] Add focused regressions in `orchestrator/tests/ProviderIssueHandoff.test.ts` for live unreadable occupancy and stale-history non-wedge behavior.
- [ ] Run the review handoff path once the validated non-trivial diff is ready.

## Dependencies
- [x] Shared admission logic already converges in `orchestrator/src/cli/control/providerIssueHandoff.ts`. Proof: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] The proof sidecar already exists adjacent to provider worker runs. Proof: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Regression coverage is anchored in `orchestrator/tests/ProviderIssueHandoff.test.ts`. Proof: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Task/docs registry mirrors will track this lane. Proof: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Validation
- [x] Docs-review child stream ran before implementation and produced an audited manifest or truthful fallback.
- [x] Focused provider admission regressions cover live unreadable occupancy and stale-history anti-wedge behavior.
- [x] Full validation floor completed for the non-trivial diff.
- [x] Standalone review evidence exists before review handoff.
- [x] Explicit elegance review exists before review handoff.
- [x] Required manual proof: a live unreadable foreign worker cannot let webhook/direct or retry admission exceed cap.
- [x] Required manual proof: unrelated stale corrupt historical manifests do not wedge new admissions host-wide.

## Risks & Mitigations
- Risk: stale proof sidecars get counted as live occupancy and recreate history inflation under a new form.
  - Mitigation: require bounded host-aware proof evidence such as active owner state plus a heartbeat TTL anchored to provider proof refresh cadence, and keep foreign-host proof handling independent from local PID checks.
- Risk: the fallback reconstructs too much manifest state and broadens this follow-up.
  - Mitigation: keep the fallback inside admission occupancy accounting instead of synthesizing a general discovered-run record.
- Risk: the implementation quietly changes broader admission contracts from `CO-125`.
  - Mitigation: keep the code change inside admission occupancy supplementation and targeted tests only.

## Approvals
- Reviewer: manual docs-review fallback after stalled child stream; final standalone review closed via truthful manual fallback after stalled wrapper
- Date: 2026-04-11
