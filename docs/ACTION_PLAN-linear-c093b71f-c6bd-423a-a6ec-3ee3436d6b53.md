# ACTION_PLAN - CO-542 deterministic quota hygiene audit

## Summary
- Goal: prepare parent implementation for a zero-model deterministic quota hygiene audit that classifies quota/auth/delegate/provider-intake evidence without model calls, default mutations, or stale-state promotion.
- Scope: docs-first packet, registry/index mirrors, and future parent-owned implementation plan for deterministic evidence classification.
- Assumptions:
  - Parent lane will perform any live Linear/GitHub/control-host reads and implementation.
  - This child lane is limited to docs files listed in the launch prompt.
  - The audit is a read-only evidence/reporting surface unless parent later widens the issue.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `zero-model deterministic quota hygiene audit`, `no default mutations`, `unknown cross-thread goals remain unknown`, `app-managed delegate false positives require corroboration`, and `stale provider-intake claims are not live WIP without live evidence`.
- Not done if:
  - normal audit execution spends model quota
  - defaults, model posture, provider caps, queue state, or persisted issue state are mutated
  - stale provider-intake or app-managed delegate evidence is promoted to live blocker truth without corroboration
  - cross-thread goals lose `unknown` status without current evidence
- Pre-implementation issue-quality review: the issue is not narrower than a quota warning cleanup and not broader than a deterministic audit/report contract; parent implementation should not change defaults or queue policy to make the audit look clean.
- Fallback / refactor decision: this task touches stale/cached/cross-thread evidence behavior. Stale provider-intake WIP inference and app-managed delegate false positives are `remove fallback`; cross-thread `unknown` retention is `justify retaining fallback` as a durable uncertainty contract.
- Durable retention evidence: `unknown` remains valid when current evidence is absent; retained provider-intake history remains audit evidence but not live WIP.
- Large-refactor decision: a broad provider-intake/status rewrite is not required because a read-only audit classifier can label evidence without changing source authority.
- Minor-seam decision: acceptable because the audit reports evidence and uncertainty without mutating runtime state or becoming a queue authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale provider-intake WIP inference | Cached provider-intake rows can look like active WIP after live state changed. | `remove fallback` | CO-542 | Audit sees provider-intake row without live worker/run/Linear/control-host proof. | Existing provider-intake retained-history behavior | 2026-05-17 | This issue | Audit classifies the row as stale or uncorroborated instead of live WIP. | Focused deterministic fixture for stale provider-intake claim. |
| App-managed delegate visibility | App-managed delegate state can look like repo-local active child/delegate ownership. | `remove fallback` | CO-542 | Delegate row lacks current run/process/manifest or parent corroboration. | Existing app-managed delegate visibility | 2026-05-17 | This issue | Audit reports uncorroborated app-managed delegate evidence and avoids quota-blocker escalation. | Focused deterministic fixture for false-positive delegate signal. |
| Cross-thread goal status | Remote or app-managed thread goal state may be missing or stale. | `justify retaining fallback` | Parent CO supervision | Current authoritative evidence is unavailable. | Existing parent-session supervision behavior | 2026-05-17 | Durable uncertainty contract | A live source or parent-approved artifact proves a concrete status. | Report schema preserves `unknown` and evidence reason. |

- Contract name: quota hygiene deterministic evidence classification.
- Owning surface: parent CO supervision / quota hygiene audit.
- Steady-state proof: report output keeps uncorroborated and unknown states separate from confirmed quota blockers.
- Tests/docs: `orchestrator/tests/QuotaHygieneCliShell.test.ts`, PRD, TECH_SPEC, ACTION_PLAN, task checklist, and task mirror.
- Non-expiring rationale: preserving `unknown` for cross-thread goals is a durable safety contract until a stronger live evidence source exists.

## Milestones & Sequencing
1. Packet and registry setup
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, and agent mirror.
   - Add the CO-542 item to `tasks/index.json`.
   - Add a concise `docs/TASKS.md` snapshot entry.
2. Parent implementation discovery
   - Identify deterministic local inputs for quota/auth/default posture, delegate/app-managed state, run manifests, control-host/co-status output, and provider-intake retained claims.
   - Decide the report command/name and schema.
   - Confirm the implementation path performs zero model calls and no default mutations.
3. Parent implementation and focused validation
   - Implement the read-only audit/report path.
   - Add focused fixtures for stale provider-intake, app-managed delegate false positive, unknown cross-thread goal, and confirmed live WIP evidence.
   - Run only touched focused tests first, then parent-selected validation gates.
4. Parent review and handoff
   - Record audit output evidence in the workpad.
   - Keep Linear/GitHub/PR lifecycle in the parent lane.

## Dependencies
- Parent-owned live control-host/co-status evidence.
- Existing local run manifests, delegate/child-lane artifacts, and provider-intake retained state.
- Parent-owned Linear/GitHub evidence only when the parent elects to corroborate live state.

## Validation
- Checks / tests:
  - child lane: scoped markdown/JSON/diff hygiene only
  - parent lane: focused deterministic fixtures and schema parsing for the audit output
  - parent lane: targeted command smoke proving zero model calls and no mutation side effects
- Rollback plan:
  - revert the audit/report path and focused fixtures; no persisted defaults or queue state should require rollback because the audit is read-only.

## Risks & Mitigations
- Risk: audit becomes another source of truth instead of an evidence classifier.
  - Mitigation: report source, timestamp, evidence class, and uncertainty reason; parent keeps routing authority.
- Risk: stale retained provider-intake rows inflate live WIP.
  - Mitigation: require live worker/run/Linear/control-host corroboration before WIP promotion.
- Risk: app-managed delegate artifacts create false quota blockers.
  - Mitigation: require corroboration and report false-positive candidates separately.
- Risk: the audit accidentally spends quota.
  - Mitigation: forbid model-backed review/agent calls in the normal path and test the command with deterministic fixtures.

## Approvals
- Reviewer: parent provider-worker lane.
- Date: 2026-05-17.
