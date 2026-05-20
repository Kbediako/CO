---
id: 20260520-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36
title: CO-552 recurring operational drift invariants
relates_to: docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md
risk: high
owners:
  - Codex
last_review: 2026-05-20
---

## Summary
- Objective: define the technical contract for CO-552 so recurring CO operational drift is prevented through authoritative lifecycle, guard, review, lease, status, Linear hygiene, and goal invariants.
- Scope: docs-first packet for a backlog/control-plane invariants umbrella; future parent/child implementation may touch lifecycle classifiers, guard engines, review state, desired-state reconciliation, provider-intake, status monitor, and Linear hygiene, but this child lane edits only this TECH_SPEC mirror plus the scoped PRD and ACTION_PLAN.
- Constraints: no blind date bumps, no gate weakening, no duplicate CO-509/CO-538 scope, no manual-only cleanup as the final solution, and no parent-owned registry/checklist/source/test edits from this child lane.

## Issue-Shaping Contract
- User-request translation carried forward: CO-552 is the governed reliability/refactor umbrella for repeated failures where stale/cached or duplicated control-plane truth outranks live authority.
- Protected terms / exact artifact and surface names: `control-plane invariants`, `canonical task/spec lifecycle`, `dry-run/non-dry parity`, `structured fallback/refactor metadata`, `SHA-bound Codex review`, `desired-state reconciler`, `process leases`, `goals mode`, `shared-root posture`, `Linear labels/relations`, `agent-loop review`, `co-control-plane:recurring-operational-drift:invariants:v1`, `codex-orchestrator:canonical-owner-key=co-control-plane:recurring-operational-drift:invariants:v1`.
- Nearby wrong interpretations to reject: blind freshness updates, weakened docs/spec/review gates, duplicate label/link issues, cached review approvals, previous-head approval reuse, manual process sweeps without leases, broad WIP admission without caps, branch-local proof replacing shared-root/control-host proof, and terminal Linear truth losing to retry/resume cache.
- Explicit non-goals carried forward: no broad product work, no replacement of CO-509 or CO-538, no extra active provider-worker slot until queue capacity allows, no stale cached fallback without owner/expiry/removal/validation, and no parent-owned integration edits by this child lane.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Lifecycle/obligation state | Task lifecycle, document obligation, registry/archive state, review state, goal state, and Linear state have been conflated. | Each domain has an authoritative state model and explicit projection rules. | One task/spec lifecycle model controls active, blocked, terminal, archived, and reopened rows. | Reclassifying rows without live/source evidence. |
| Guard semantics | Dry-run and non-dry behavior can drift when validation and write behavior are coupled. | Dry-run skips writes only. | Shared selector/rule engine produces matching pass/fail semantics. | Weakening `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`. |
| Fallback metadata | Guard-critical fallback truth can depend on prose and table variants. | Structured or schema-validated metadata fails closed. | Fallback/refactor decisions are parseable, schema-validated, and connected to owner/removal/validation evidence. | Prose-only fallback acceptance. |
| Review state | `review_verdict=unknown`, missing review, or previous-head review can be confused with clean. | Clean review is explicit for the current PR head SHA. | New heads invalidate prior approvals and manual review triggers are idempotent once per SHA. | Treating empty findings as clean without a clean verdict. |
| Desired state | WIP, retry/resume, worker branches, process ownership, goals, and status can preserve stale cached state. | Live Linear/GitHub/control-host authority wins. | Desired-state reconciler reports or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift. | Hand-editing state files or manual-only sweeps as final solution. |
| Linear hygiene | Auto-created issues can miss labels/relations. | Creation/reuse verifies live labels and relations. | CO-552 builds on CO-509 and CO-538 and requires a reconciler failure when labels/relations drift. | Replacing those narrower owner lanes. |
| Status monitor | Issue, goal, process/agent, branch, review, and gate state can overlap. | Counters and sections are separate by authority domain. | Status monitor displays each authority domain without duplicate or overlapping goals. | Cosmetic status redesign. |

## Readiness Gate
- Not done if:
  - recurring docs/spec freshness debt can still block unrelated lanes without a pre-expiry owner
  - dry-run and non-dry guard paths can disagree on pass/fail semantics
  - Codex review approval is not tied to the current PR head SHA
  - unowned CO processes/agents/goals can burn quota unnoticed
  - issue auto-creation can succeed with missing labels or relations
  - goals overlap per issue/lane
  - reviews do not produce both code-change and agent-loop-change recommendations
  - terminal Linear truth can lose to retry/resume cache
  - branch-local proof replaces shared-root/control-host proof
- Pre-implementation issue-quality review evidence: read-only Linear issue-context on 2026-05-20 showed CO-552 `In Progress`, no attached PR, one active parent workpad, the parent-launched `packet-docs` child lane, protected terms, comments, and acceptance criteria. The declared `source-0` payload was absent from this child checkout, so the packet records that caveat.
- Safeguard ownership split: child owns only `docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`, `docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`, and `docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`; parent owns registry/checklist mirrors, source/test implementation, Linear/workpad state, PR lifecycle, and validation suites.

## Technical Requirements
- Functional requirements:
  1. Define one authoritative task/spec lifecycle for active, blocked, terminal, archived, and reopened rows.
  2. Ensure terminal or archived specs do not participate in active freshness caps, fallback expiry, or provider-worker blocking unless explicitly reopened.
  3. Route dry-run and non-dry guard execution through the same selector/rule engine; dry-run skips writes only.
  4. Represent fallback/refactor metadata with structured data or a schema-validated parser; fragile prose or table variants fail closed.
  5. Key Codex review state by PR head SHA, including approval/finding state and manual trigger attempts.
  6. Invalidate stale approvals on new PR heads.
  7. Build a desired-state reconciler that reports or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift.
  8. Verify Linear labels and relations at creation/reuse time and through reconciliation, linking to CO-509 and CO-538 rather than replacing them.
  9. Make reviews check the original spec, coding standards, required code changes, and changes to the creating agent loop.
  10. Make the status monitor display issue, goal, process/agent, branch, review, and gate state without overlapping or duplicate goals.
- Non-functional requirements:
  - deterministic machine-readable output for guard, reconciliation, and status decisions
  - fail-closed behavior for stale, cached, missing, or unparsable authority evidence
  - bounded child workstreams with disjoint ownership and focused validation
  - no queue-cap bypass or hidden quota-spending path
- Interfaces / contracts:
  - `docs:freshness`, `docs:freshness:maintain`, `spec-guard`
  - provider-intake and retry/resume state projection
  - `co-status` and control-host status surfaces
  - Codex/CodeRabbit review state and `pr ready-review`
  - Linear issue creation/reuse, labels, relations, and issue-context truth
  - goals-mode registry/monitor under Linear authority

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes. CO-552 exists because several high-churn control surfaces rely on stale/cached/fallback seams.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Task/spec lifecycle | Terminal, archived, or done rows still counted as active freshness/fallback/provider-worker blockers | remove fallback | CO-552 | Active gates see terminal or archived rows as live obligations without explicit reopen evidence | 2026-05-17 | 2026-05-20 | 0 days after implementation | One canonical lifecycle model drives freshness, fallback expiry, and provider-worker blocking | lifecycle classifier tests plus `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` |
| Guard execution | Dry-run/non-dry selector or rule divergence | remove fallback | CO-552 | Dry-run skips validation semantics instead of writes only | 2026-05-17 | 2026-05-20 | 0 days after implementation | Shared selector/rule engine used by both execution modes | parity tests proving dry-run skips writes only |
| Fallback/refactor evidence | Guard-critical truth inferred from prose or fragile Markdown variants | remove fallback | CO-552 | Fallback metadata is incomplete, unparseable, or silently accepted | 2026-05-17 | 2026-05-20 | 0 days after implementation | Structured data or schema-validated parser fails closed | parser/schema tests plus docs packet fixtures |
| Review state | Cached or previous-head review approval treated as current | remove fallback | CO-552 | PR head SHA changes or review verdict is `unknown`/missing | 2026-05-17 | 2026-05-20 | 0 days after implementation | Current-head SHA-bound review state is required for clean handoff | review state tests and ready-review proof |
| Desired-state reconciliation | Stale provider-intake, retry/resume, process, branch, goal, or status cache outranks live authority | remove fallback | CO-552 | Cached claim or process state disagrees with live Linear/GitHub/control-host truth | 2026-05-17 | 2026-05-20 | 0 days after implementation | Reconciler reports or repairs drift and live terminal truth dominates cache | reconciler tests plus status monitor proof |
| Linear hygiene | Snapshot-only labels/relations treated as creation success | remove fallback | CO-552 with CO-509/CO-538 | Auto-created/reused issue lacks required labels or relations on live readback | 2026-05-17 | 2026-05-20 | 0 days after implementation | Live label/relation verification and reconciler failures are surfaced | Linear hygiene tests or dry-run/live-read evidence |

- Large-refactor check: the fallback-expiry policy prefers a large refactor when authority is split across live state, cached state, stale manifests, legacy proof fields, or synthesized status rows. CO-552 should therefore plan a governed control-plane refactor and split child streams only where each stream removes or expires a narrow seam without adding another hidden fallback.

## Architecture & Data
- Architecture / design adjustments:
  - introduce or consolidate lifecycle authority before status or guard projections consume task/spec rows
  - centralize guard selectors/rules for dry-run and non-dry execution
  - make fallback/refactor evidence structured enough for deterministic validation
  - treat review, PR readiness, parent blockers, worker handoff evidence, and current-head review state as typed control-plane resources
  - subordinate provider-intake claims, goals, and process leases to live Linear/GitHub/control-host truth
- Data model changes / migrations:
  - future implementation may need typed records for `IssueAuthorityLease`, `ParentAcceptanceBlocker`, `WorkerHandoffEvidence`, `PRReadinessState`, `CurrentHeadReviewState`, and `Lifecycle/ObligationClassification`
  - goals-mode entries should include Linear issue/lane ownership and lease alignment
  - fallback/refactor metadata should include decision, owner, trigger, introduced date, review date, maximum lifetime, removal condition, and validation in parseable form
- External dependencies / integrations:
  - Linear issue context, labels, relations, and states
  - GitHub PR head SHA, checks, review threads, and review decisions
  - Codex/CodeRabbit review telemetry
  - control-host and shared-root proof

## Acceptance Criteria
- Backlog packet defines one authoritative lifecycle model for active, blocked, terminal, archived, and reopened task/spec rows.
- Guard dry-run and non-dry execution share the same selector/rule engine, with tests proving dry-run skips writes only.
- Fallback/refactor metadata is represented by structured data or a schema-validated parser, with fragile prose/table variants fail-closed.
- Desired-state reconciler reports and/or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift.
- Codex review automation records current head SHA, approval/finding state, manual trigger attempts, and invalidates stale approvals on new heads.
- Linear issue auto-creation/reuse paths prove live labels and relations, linking to CO-509 and CO-538 rather than duplicating their scope.
- Review workflow checks original spec and coding standards, proposes code changes, and proposes changes to the creating agent loop.
- Status monitor displays issue, goal, process/agent, branch, review, and gate state without overlapping or duplicate goals.

## Validation Plan
- Tests / checks:
  - child lane: `git diff --check -- docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`
  - parent lane: docs-review before implementation and implementation-gate after source/test changes
  - focused lifecycle, guard parity, fallback metadata parser/schema, review head-SHA, desired-state reconciler, Linear hygiene, goals, and status-monitor regressions as implementation surfaces are selected
  - parent validation floor from workpad: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed review, elegance pass, and `pr ready-review`
- Rollout verification:
  - parent records before/after status counters and current-head review evidence
  - parent records live Linear/GitHub/control-host reads for authority claims
  - parent records related issue links instead of duplicate narrower owners
- Monitoring / alerts:
  - status monitor counters should include parent blockers, duplicate leases, unowned processes, expired owned processes, current-head review state, stale reviews, docs freshness action paths, missing Linear labels/links, duplicate goals, orphan goals, and goals without active leases

## Open Questions
- Which target resource becomes the first enforcement point: parent blocker ledger, lifecycle classifier, provider-intake live-state reconciler, or head-SHA review state?
- Should the desired-state reconciler begin in shadow mode before fail-closed enforcement?

## Approvals
- Reviewer: CO provider worker / parent CO-552 lane
- Date: 2026-05-20
