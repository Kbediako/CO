# ACTION_PLAN - CO: released stale blocker metadata must not re-block issues after blocker issues are Done

## Summary
- Goal: give the parent lane a bounded plan to prevent stale released/not-active blocker metadata from re-blocking a live issue after all referenced blockers are terminal.
- Scope: parent-owned source inspection, focused terminal-blocker handling, regression coverage for `CO-295` / `CO-300 Done`, and optional stale-blocker advisory evidence.
- Assumptions:
  - the shared `source-0` payload is metadata-only
  - the authoritative issue body is Linear `CO-302`, fetched read-only on 2026-04-22
  - the narrowest correct answer is in released-claim blocker reconciliation or stale-blocker advisory handling, not a broad provider lifecycle rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-intake-state.json`
  - `provider_issue_released:not_active`
  - `issue_blocked_by`
  - `CO-295`
  - `CO-300`
  - `Done`
  - `Cancelled`
  - `Blocked`
  - released claim
  - queue truth
  - stale blocker metadata
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - PR `#594`
  - merge commit `4d80fb60f`
- Not done if:
  - a released/not-active claim can still overwrite an issue to `Blocked` when every `issue_blocked_by` issue is already terminal `Done` or `Cancelled`
  - manual reclaim of the affected issue is still unstable because the stale released row re-applies the wrong blocker state on the next reconcile
  - Linear queue state and `provider-intake-state.json` can still disagree on blocker truth without an explicit stale-blocker advisory or repair path
- Pre-implementation issue-quality review:
  - accepted framing is stale released blocker metadata overwrite: `CO-295` was reclaimed, then stale `issue_blocked_by=[CO-300 Done]` from a released row forced `Blocked` again
  - rejected framings are `CO-295` PR attachment ownership expansion, generic provider lifecycle rewrite, manual state flip, and provenance weakening

## Milestones & Sequencing
1. Parent inspects the released/not-active claim refresh and reconcile/poll projection path that reads `provider-intake-state.json` and applies `issue_blocked_by` to live issue state.
2. Parent identifies the existing terminal-state classifier for blocker issues and verifies it covers `Done` and canceled/`Cancelled` terminal states.
3. Parent implements the narrowest terminal-blocker handling: drop, neutralize, or ignore terminal blocker links from released claims before they can force `Blocked`.
4. Parent preserves released-claim provenance and valid non-terminal blocker semantics while adding stale-blocker advisory evidence if automatic repair is not safe.
5. Parent adds focused regression coverage for the `CO-295` / `CO-300 Done` stale-blocker overwrite shape and a guard that non-terminal blockers still block.
6. Parent reruns docs-review and the scoped validation floor required for the implementation diff.

## Dependencies
- Shared source 0 anchor: `ctx:sha256:d829d982421ba4529dabb021e70362809faafbd4fc438e1d113e8992538c858c#chunk:c000001`
- Source payload note: metadata-only source payload at `.runs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689-docs-packet/cli/2026-04-22T05-53-20-299Z-b3f6fed4/memory/source-0/source.txt`
- Read-only Linear issue body: `CO-302`, fetched 2026-04-22 with no mutation helper calls
- Incident evidence named in issue body:
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `CO-295`
  - `CO-300 Done`
  - `reason=provider_issue_released:not_active`
  - `run_id=2026-04-21T16-08-48-577Z-c085bbbf`
  - PR `#594`
  - merge commit `4d80fb60f`

## Validation
- Checks / tests:
  - child lane only: `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - child lane only: protected-term grep across packet and mirror files
  - child lane only: `git diff --check --` on touched files
  - parent only: focused regression for `CO-295` / `CO-300 Done` stale-blocker overwrite
  - parent only: focused proof that non-terminal blockers still block
  - parent only: focused proof that released claim provenance remains auditable
  - parent only: docs-review and required validation floor after source edits
- Rollback plan:
  - revert any implementation that weakens provider provenance, hides stale released rows, or stops valid non-terminal blockers from blocking

## Risks & Mitigations
- Risk: terminal blocker filtering deletes too much released-claim audit evidence.
  - Mitigation: preserve provenance fields and only neutralize blocker authority.
- Risk: the fix treats all blocker links as stale.
  - Mitigation: add a non-terminal blocker regression.
- Risk: the parent drifts into `CO-295` PR attachment ownership or broad lifecycle redesign.
  - Mitigation: keep exact non-goals and Not Done If clauses in the spec and checklist.
- Risk: automatic repair is unsafe without broader provenance review.
  - Mitigation: surface explicit stale-blocker advisory evidence instead of silently overwriting live issue state.

## Approvals
- Reviewer: pending parent implementation
- Date: 2026-04-22
