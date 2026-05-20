# PRD - CO-552 recurring operational drift invariants

## Traceability
- Linear issue: `CO-552` / `46ef15a6-8118-4534-9efe-31eaa9d9ab36`
- Linear URL: https://linear.app/asabeko/issue/CO-552/co-enforce-recurring-operational-drift-invariants
- Task id: `linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36`
- Source anchor: `ctx:sha256:3213f8e98997f636dac9d430d9af9f7d29be81449260d627e30577ef7ca5aa41#chunk:c000001`
- Source manifest: `.runs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36-packet-docs/cli/2026-05-20T01-12-50-179Z-fa527bc6/manifest.json`
- Source payload: `.runs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36-packet-docs/cli/2026-05-20T01-12-50-179Z-fa527bc6/memory/source-0/source.txt`
- Source payload note: the declared source payload path was not present in this child checkout. The packet is anchored on a read-only `codex-orchestrator linear issue-context --issue-id 46ef15a6-8118-4534-9efe-31eaa9d9ab36 --format json` read on 2026-05-20 plus the parent-provided source anchor.

## Summary
- Problem Statement: CO keeps seeing recurring operational failures across docs freshness, provider intake, review handoff, WIP, process ownership, goals, Linear links, and PR readiness. These failures are not isolated date or cleanup misses; they come from duplicated lifecycle truth, weak desired-state reconciliation, and stale/cached review or provider state outranking authoritative live sources.
- Desired Outcome: create a governed control-plane invariants lane that defines the target contracts, child workstreams, and validation posture before implementation, without weakening strict gates, blindly bumping dates, or duplicating narrower issue scopes.

## User Request Translation
- User intent / needs:
  - create the CO-552 docs-first packet before active implementation
  - preserve the umbrella issue as a backlog/control-plane invariants lane
  - make `control-plane invariants` explicit across lifecycle, guard, review, lease, status, Linear hygiene, and goals surfaces
  - link narrower owners such as `CO-509`, `CO-538`, `CO-548`, `CO-520`, `CO-522`, `CO-553`, `CO-554`, and `CO-555` instead of replacing or absorbing them
  - keep the packet separate from parent-owned registry, checklist, Linear workpad, PR lifecycle, implementation, and tests
- Success criteria / acceptance:
  - packet docs preserve protected terms, non-goals, Not Done If, source evidence, and issue acceptance criteria
  - future implementation defines one authoritative lifecycle model for active, blocked, terminal, archived, and reopened task/spec rows
  - dry-run and non-dry guard paths share selector/rule semantics
  - fallback/refactor metadata stops relying on fragile prose/table variants
  - desired-state reconciliation covers WIP, process leases, goals, shared-root posture, stale worker branches, review, and Linear relation/label drift
  - current-head review and status-monitor contracts are explicit and head-SHA bound
- Constraints / non-goals:
  - no blind `last_review` bumps
  - no weakening `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`
  - no manual-only process cleanup as the final solution
  - no broad product work
  - no replacement of CO-509 or CO-538 label/link scope
  - no extra active provider-worker slot until queue capacity allows
  - no fallback that depends on stale cached state without owner, expiry, removal condition, and validation

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `control-plane invariants`
  - `canonical task/spec lifecycle`
  - `dry-run/non-dry parity`
  - `structured fallback/refactor metadata`
  - `SHA-bound Codex review`
  - `desired-state reconciler`
  - `process leases`
  - `goals mode`
  - `shared-root posture`
  - `Linear labels/relations`
  - `agent-loop review`
  - `co-control-plane:recurring-operational-drift:invariants:v1`
  - `codex-orchestrator:canonical-owner-key=co-control-plane:recurring-operational-drift:invariants:v1`
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `spec-guard`
  - `CO-543`
  - `CO-509`
  - `CO-538`
  - `CO-548`
  - `CO-520`
  - `CO-522`
  - `CO-553`
  - `CO-554`
  - `CO-555`
  - `CO-512`
  - `CO-516`
  - `IssueAuthorityLease`
  - `ParentAcceptanceBlocker`
  - `WorkerHandoffEvidence`
  - `PRReadinessState`
  - `CurrentHeadReviewState`
  - `Lifecycle/ObligationClassification`
- Nearby wrong interpretations to reject:
  - treating this as a blind freshness date bump or stale-doc cleanup lane
  - weakening `spec-guard`, `docs:freshness`, `docs:freshness:maintain`, or review gates to unblock unrelated work
  - creating duplicate label/link lanes instead of linking to CO-509 and CO-538
  - relying on cached review state or allowing one PR head approval to cover another head
  - manually sweeping processes without leases and calling that the final solution
  - adding broad WIP without keeping active issues under the CO cap
  - letting terminal Linear truth lose to stale retry/resume cache
  - letting branch-local proof stand in for shared-root/control-host proof

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Task/spec lifecycle | Stale active specs, archived/done docs with open checklists, and terminal rows have repeatedly leaked into active freshness or provider-worker blocking. | One authoritative lifecycle model determines active, blocked, terminal, archived, and reopened task/spec rows. | Terminal or archived specs do not participate in active freshness caps, fallback expiry, or provider-worker blocking unless explicitly reopened. | Blind date bumps, registry-only reclassification, or deleting historical docs. |
| Guard semantics | Dry-run and non-dry paths can drift when writes are skipped together with validation semantics. | Dry-run skips writes only. Selectors and rule engines are shared. | `spec-guard`, docs freshness, and fallback/refactor guards produce parity pass/fail semantics across dry-run and non-dry execution. | Weakening gates or adding manual-only waiver paths. |
| Fallback/refactor metadata | Guard-critical truth can be inferred from prose or fragile Markdown table variants. | Fallback/refactor metadata is structured or schema-validated and fails closed when incomplete. | `remove fallback`, `expire fallback`, and `justify retaining fallback` decisions become machine-readable enough for guard use. | Accepting prose-only fallback evidence for control-plane decisions. |
| Review authority | Review state can be stale, unknown, or not bound to the current PR head SHA. | Clean review means explicit clean verdict for the current head SHA. | New heads invalidate prior approvals; manual review triggers are idempotent once per SHA when automatic review does not start. | Treating `review_verdict=unknown` or empty findings as clean. |
| Desired state and leases | Provider-intake claims, worker branches, process state, goals, WIP, and status can preserve stale cached truth. | Live Linear/GitHub/control-plane authority dominates stale cache. | Reconciler reports or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift. | Manual-only process cleanup or hand-editing provider state files as the final solution. |
| Linear hygiene | Auto-created issues can miss labels or relations unless later humans notice. | Issue creation/reuse proves live labels and relations at creation time and via reconciliation. | CO-552 links to CO-509 and CO-538 and requires live label/relation verification rather than duplicating their narrow scope. | Replacing CO-509 or CO-538. |
| Status monitor | Issue state, goal state, process/agent state, review state, branch posture, and gate state can overlap. | Monitor separates authority domains and counters. | Status monitor shows issue, goal, process/agent, branch, review, and gate state without duplicate or overlapping goals. | A marketing/status redesign unrelated to operator decisions. |

## Source Evidence
- CO-543 showed stale active specs and docs freshness debt recurring at date boundaries while unrelated provider-worker lanes were trying to validate.
- CO-543 repairs the immediate stale cohort and adds pre-expiry routing, but intentionally does not broaden into a full control-plane refactor.
- GPT Pro advisory on 2026-05-17 recommended one authoritative task/spec lifecycle, one guard contract shared by dry-run and non-dry paths, desired-state reconciliation for WIP/processes/goals/branches/reviews/Linear links, SHA-bound review automation, and agent-loop review feedback.
- CO-522/CO-553 evidence kept `docs:freshness:maintain` strict, rejected blind `last_review` bumps and gate weakening, and routed broader recurrence to CO-552.
- CO-554 evidence shows a PR that removes a global blocker needs a typed landing exception, current-head review, green checks, zero unresolved threads, owner relation to the live blocker, and a post-merge shared-root rerun.
- CO-555 evidence shows terminal Linear truth must dominate retry/resume cache for WIP, status, and quota-hygiene active state.
- CO-512 and CO-516 comments show stale provider-intake and cached state can strand active issues or preserve retry projections after live Linear state changes.
- Parent workpad evidence says this child lane owns only the three packet docs; parent owns registry/checklist mirrors, implementation, validation, Linear state, and PR lifecycle.

## Not Done If
- Recurring docs/spec freshness debt can still block unrelated lanes without a pre-expiry owner.
- Dry-run and non-dry guard paths can disagree on pass/fail semantics.
- Codex review approval is not tied to the current PR head SHA.
- Unowned CO processes, agents, or goals can burn quota unnoticed.
- Issue auto-creation can succeed with missing labels or relations.
- Goals overlap per issue/lane.
- Reviews do not produce both code-change and agent-loop-change recommendations.
- Terminal Linear truth can still lose to retry/resume cache when computing WIP, status, or quota-hygiene active state.
- Branch-local proof can be promoted as shared-root/control-host proof without an explicit typed exception and post-merge obligation.
- The lane becomes a blind date bump, gate weakening, duplicate-label/link owner, or broad product-work effort.

## Acceptance Criteria
- Backlog packet defines one authoritative lifecycle model for active, blocked, terminal, archived, and reopened task/spec rows.
- Guard dry-run and non-dry execution share the same selector/rule engine, with tests proving dry-run skips writes only.
- Fallback/refactor metadata is represented by structured data or a schema-validated parser, with fragile prose/table variants fail-closed.
- Desired-state reconciler reports and/or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift.
- Codex review automation records current head SHA, approval/finding state, manual trigger attempts, and invalidates stale approvals on new heads.
- Linear issue auto-creation/reuse paths prove live labels and relations, linking to CO-509 and CO-538 rather than duplicating their scope.
- Review workflow checks original spec and coding standards, proposes code changes, and proposes changes to the creating agent loop.
- Status monitor displays issue, goal, process/agent, branch, review, and gate state without overlapping or duplicate goals.

## Goals
- Define the CO-552 umbrella packet for recurring operational drift prevention.
- Establish target invariants for lifecycle authority, guard parity, fallback/refactor metadata, SHA-bound review, desired-state reconciliation, process leases, goals mode, Linear hygiene, and status monitoring.
- Preserve related/narrower ownership so implementation can sequence child workstreams without duplicating existing lanes.
- Require validation to prove no gate weakening and no stale/cached authority wins.

## Non-Goals
- No source, test, registry, checklist, workpad, Linear state, GitHub, or PR lifecycle edits in this child lane.
- No blind `last_review` bumps or metadata-only freshness cleanup.
- No weakening strict docs/spec/review gates.
- No manual-only process cleanup as final solution.
- No replacement of CO-509, CO-538, CO-520, CO-522, CO-553, CO-554, CO-555, or CO-548.
- No broad product feature work.
- No extra active provider-worker slot until queue capacity allows.

## Stakeholders
- Product: CO operators who need status, review, queue, and gate signals to reflect current authoritative truth.
- Engineering: parent CO-552 lane and future child workstreams implementing the control-plane invariants.
- Review: maintainers validating that the umbrella prevents recurring failures instead of masking them.

## Metrics & Guardrails
- Primary Success Metrics:
  - one canonical lifecycle model is documented and enforced for task/spec rows
  - dry-run/non-dry guard parity tests exist
  - fallback/refactor metadata is schema-validated or otherwise fail-closed
  - current-head review state is SHA-bound and stale approvals invalidate on new heads
  - desired-state reconciliation surfaces WIP, lease, goal, branch, review, gate, and Linear label/relation drift
  - status monitor separates issue, goal, process/agent, branch, review, and gate state
- Guardrails / Error Budgets:
  - zero gate weakening
  - zero blind date bumps
  - zero duplicate label/link owner creation
  - zero parent-owned file edits from this child lane
  - parser/review waivers are telemetry-only and cannot clear implementation blockers

## User Experience
- Personas: CO operator, provider-worker parent lane, review/merge shepherd, and future child-stream implementer.
- User Journeys:
  - operator sees whether a blocker is self-owned, external-owner debt, or true current-diff debt before admitting more WIP
  - parent lane can split child workstreams without losing the umbrella invariants
  - reviewer can reject stale approval, cache-derived WIP, or gate-waiver claims when they are not current-source bound

## Technical Considerations
- Architectural Notes:
  - The control plane should own authority, blockers, readiness, review cleanliness, leases, and lifecycle decisions.
  - Workers can produce implementation and evidence, but should not grant authority, close parent blockers, or mark review clean.
  - Provider-intake claims should be projections of live Linear/GitHub truth rather than preserved stale state.
  - Goals mode is subordinate to Linear and issue leases, with at most one active goal per Linear issue/lane.
- Dependencies / Integrations:
  - `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, provider-intake, `co-status`, Codex/CodeRabbit review state, Linear labels/relations, PR readiness checks, and control-host/shared-root posture.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor decision: prefer a governed control-plane refactor over another minor seam because authority is split across live Linear/GitHub state, cached provider-intake state, review telemetry, docs/spec lifecycle metadata, goals, branches, processes, and status projections.
- Minor-seam decision: individual child workstreams may remove or expire narrow seams only when they do not obscure which source of truth wins and include focused validation.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Task/spec lifecycle | Terminal, archived, or done rows still counted as active freshness/fallback/provider-worker blockers | remove fallback | CO-552 | Active gates see terminal or archived rows as live obligations without explicit reopen evidence | 2026-05-17 | 2026-05-20 | 0 days after implementation | One canonical lifecycle model drives freshness, fallback expiry, and provider-worker blocking | lifecycle classifier tests plus `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` |
| Guard execution | Dry-run/non-dry selector or rule divergence | remove fallback | CO-552 | Dry-run skips validation semantics instead of writes only | 2026-05-17 | 2026-05-20 | 0 days after implementation | Shared selector/rule engine used by both execution modes | parity tests proving dry-run skips writes only |
| Fallback/refactor evidence | Guard-critical truth inferred from prose or fragile Markdown variants | remove fallback | CO-552 | Fallback metadata is incomplete, unparseable, or silently accepted | 2026-05-17 | 2026-05-20 | 0 days after implementation | Structured data or schema-validated parser fails closed | parser/schema tests plus docs packet fixtures |
| Review state | Cached or previous-head review approval treated as current | remove fallback | CO-552 | PR head SHA changes or review verdict is `unknown`/missing | 2026-05-17 | 2026-05-20 | 0 days after implementation | Current-head SHA-bound review state is required for clean handoff | review state tests and ready-review proof |
| Desired-state reconciliation | Stale provider-intake, retry/resume, process, branch, goal, or status cache outranks live authority | remove fallback | CO-552 | Cached claim or process state disagrees with live Linear/GitHub/control-host truth | 2026-05-17 | 2026-05-20 | 0 days after implementation | Reconciler reports or repairs drift and live terminal truth dominates cache | reconciler tests plus status monitor proof |
| Linear hygiene | Snapshot-only labels/relations treated as creation success | remove fallback | CO-552 with CO-509/CO-538 | Auto-created/reused issue lacks required labels or relations on live readback | 2026-05-17 | 2026-05-20 | 0 days after implementation | Live label/relation verification and reconciler failures are surfaced | Linear hygiene tests or dry-run/live-read evidence |

## Proposed Child Workstreams
1. Canonical task/spec lifecycle model and terminal-spec exclusion.
2. Authoritative guard contract for dry-run/non-dry parity and structured fallback/refactor metadata.
3. Desired-state reconciler for WIP caps, process leases, goals, shared-root posture, and stale worker branches.
4. SHA-bound Codex review automation with idempotent manual trigger and approval invalidation.
5. Linear hygiene reconciler that builds on CO-509 and CO-538 instead of replacing them.
6. Review-quality upgrade that proposes code changes and creator-loop changes against original spec and coding standards.

## Open Questions
- Which child stream should land first after the packet and parent mirrors are complete: parent blocker/PR readiness, lifecycle classifier, review head-SHA state, or provider-intake live-state reconciliation?
- Should the first implementation expose shadow-mode status counters before enforcing fail-closed reconciliation?

## Approvals
- Product: CO-552 Linear issue description and comments
- Engineering: bounded docs-only child lane
- Design: N/A
