# ACTION_PLAN - CO-556 auto-restart or fail closed on stale resident code

## Summary
- Goal: after CO-515 makes `supervised control-host source freshness` trustworthy, make stale resident code trigger bounded auto-restart or fail closed behavior before active WIP continues as fresh.
- Scope: docs packet, parent implementation contract, stale resident code policy, `control-host-owner.json`, `source_root_freshness`, `co-status --format json`, terminal Linear truth, active WIP, and registration metadata.
- Assumptions:
  - CO-515 owns stale-source recompute/invalidation.
  - CO-556 consumes current freshness truth and defines policy response.
  - CO-555 terminal-claim precedence remains authoritative.
  - `provider-intake-state.json` remains audit evidence.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `supervised control-host source freshness`
  - `control-host-owner.json`
  - `source_root_freshness`
  - stale resident code
  - `origin/main`
  - `provider-intake-state.json`
  - `co-status --format json`
  - terminal Linear truth
  - active WIP
  - auto-restart
  - fail closed
  - CO-515 stale-source recompute/invalidation
  - CO-555 terminal-claim precedence
  - CO-458
  - CO-552 drift invariants
- Not done if:
  - stale resident code still allows active WIP to look fresh
  - stale `source_root_freshness` does not trigger auto-restart or fail closed
  - auto-restart can claim success without proving a current supervised source root
  - fail closed deletes or rewrites `provider-intake-state.json`
  - terminal Linear truth is weakened
  - parent duplicates CO-515, reopens CO-458, or broadens into all CO-552 drift invariants
- Pre-implementation issue-quality review:
  - 2026-05-20: docs child lane kept CO-556 as the policy response after trustworthy source freshness detection. The lane is not a source-freshness recompute lane, provider-intake cleanup lane, or broad drift-invariant sweep.
- Fallback / refactor decision:
  - This task touches stale/fail-open behavior. Decision: `remove fallback` for active-WIP handling on stale resident code.
- Durable retention evidence:
  - `provider-intake-state.json` is retained as audit evidence, not as a retained stale-code fallback.
- Large-refactor check: keep the implementation scoped to stale resident code policy unless duplicate restart/fail-closed authority requires a shared helper.
- Minor-seam decision: acceptable because the policy consumes existing freshness evidence and preserves terminal Linear truth.

## Fallback Metadata

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale resident code policy | Stale `source_root_freshness` can coexist with active WIP that still looks actionable. | remove fallback | CO-556 | `control-host-owner.json` or `co-status --format json` reports the supervised source root behind `origin/main`. | Observed 2026-05-20 | 2026-05-20 | This issue | Stale resident code triggers bounded auto-restart when safe or fail closed before work continues as fresh. | Focused control-host policy tests, status projection assertions, and CO-555 terminal-precedence regression coverage. |

## Milestones & Sequencing
1. Register the CO-556 docs packet in the declared files: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, `.agent/task` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parent inspects the control-host owner/freshness projection that writes or reads `control-host-owner.json`, `source_root_freshness`, `/ui/data.json`, and `co-status --format json`.
3. Parent chooses the policy boundary for stale resident code: control-host polling loop, provider-worker admission/resume path, or shared helper.
4. Parent adds bounded auto-restart behavior that is triggered only by clear stale resident code evidence and proves restart success before clearing the policy state.
5. Parent adds fail closed behavior when auto-restart is unavailable, unsafe, or unproven.
6. Parent preserves `provider-intake-state.json` audit evidence and terminal Linear truth precedence.
7. Parent adds focused tests for stale resident code, restart success/failure, fail closed projection, and CO-555 terminal-precedence preservation.
8. Parent runs docs-review, focused implementation validation, implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.

## Dependencies
- CO-515 trustworthy stale-source recompute/invalidation
- CO-555 terminal-claim precedence
- `control-host-owner.json`
- `source_root_freshness`
- `origin/main`
- `co-status --format json`
- `/ui/data.json`
- `provider-intake-state.json`
- active WIP provider-worker projection

## Validation
- Child lane:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - protected-term scan over declared CO-556 packet and registration files
  - `git diff --check` over declared touched paths
- Parent lane:
  - focused stale resident code policy tests
  - auto-restart success, unavailable, unproven, and fail closed cases
  - `co-status --format json` or `/ui/data.json` projection assertion
  - terminal Linear truth / CO-555 active-WIP precedence regression coverage
  - no manual `provider-intake-state.json` deletion or rewrite
  - implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff

## Risks & Mitigations
- Risk: parent duplicates CO-515 freshness recompute instead of consuming source freshness truth.
  - Mitigation: acceptance requires CO-556 to consume `source_root_freshness` and keep CO-515 as the recompute/invalidation owner.
- Risk: auto-restart turns into an unbounded loop.
  - Mitigation: acceptance requires bounded restart attempts and fail closed when restart cannot be proven.
- Risk: fail closed is implemented by deleting provider-intake state.
  - Mitigation: acceptance requires `provider-intake-state.json` to remain audit evidence.
- Risk: terminal retry/resumable claims become active WIP again.
  - Mitigation: acceptance requires CO-555 terminal Linear truth precedence tests.

## Approvals
- Reviewer: CO-556 provider worker / parent lane.
- Date: 2026-05-20.
