# ACTION_PLAN - CO-552 recurring operational drift invariants

## Summary
- Goal: turn CO-552 into the governed control-plane invariants umbrella for recurring operational drift across lifecycle, guard, review, lease, goals, status, and Linear hygiene surfaces.
- Scope: this child lane drafts only the PRD, TECH_SPEC, and ACTION_PLAN packet docs. Parent owns registry/checklist mirrors, implementation, validation, Linear state, workpad, PR lifecycle, and patch import.
- Assumptions: the declared source payload is unavailable in this child checkout; read-only Linear issue-context on 2026-05-20 is the operative issue/comment evidence for this packet.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `control-plane invariants`, `canonical task/spec lifecycle`, `dry-run/non-dry parity`, `structured fallback/refactor metadata`, `SHA-bound Codex review`, `desired-state reconciler`, `process leases`, `goals mode`, `shared-root posture`, `Linear labels/relations`, `agent-loop review`, `co-control-plane:recurring-operational-drift:invariants:v1`, `codex-orchestrator:canonical-owner-key=co-control-plane:recurring-operational-drift:invariants:v1`.
- Not done if: recurring docs/spec freshness debt can still block unrelated lanes without a pre-expiry owner; dry-run and non-dry guards can disagree; review approval is not tied to current PR head SHA; unowned processes/agents/goals burn quota unnoticed; issue auto-creation can miss labels or relations; goals overlap per issue/lane; reviews omit code-change or agent-loop-change recommendations; terminal Linear truth loses to retry/resume cache; branch-local proof replaces shared-root/control-host proof.
- Pre-implementation issue-quality review: read-only issue-context showed CO-552 `In Progress`, labels for P1 implementation/docs/infra/agents/devops/bug scope, no attached PR, one workpad, protected terms, source evidence comments, and parent-owned acceptance criteria. The issue is broader than a freshness date or docs cleanup; it is a control-plane authority and reconciliation lane.
- Fallback / refactor decision: this task touches stale/cached/fallback/control-plane seams. The umbrella prefers a governed control-plane refactor and removes narrow stale/cached seams in child streams rather than retaining fallback behavior.
- Durable retention evidence: no durable retained fallback is approved by this packet. Any future retained branch must provide owner, trigger, introduced date, review date, maximum lifetime, removal condition, reason, and validation.
- Large-refactor check: large refactor is preferred because the same failure family spans multiple lifecycle phases and authority is split across live state, cached state, stale manifests, legacy proof fields, review telemetry, goals, branches, processes, and status rows.

## Source Evidence
- CO-543 surfaced recurring stale active specs and docs freshness debt at date boundaries while unrelated provider-worker lanes were trying to validate.
- GPT Pro advisory comments on 2026-05-17 recommended typed control-plane resources, live authority leases, current-head review state, desired-state reconciliation, and goal/lease alignment under Linear authority.
- CO-522/CO-553 evidence preserves strict docs freshness behavior and routes recurrence/process invariant work to CO-552 instead of using blind `last_review` bumps or gate weakening.
- CO-554 comments add the typed landing-exception invariant for PRs that remove global blockers.
- CO-555 comments add the invariant that terminal Linear truth must dominate retry/resume cache when computing WIP, status, and quota-hygiene active state.
- CO-512/CO-516 comments show stale provider-intake state can preserve retry/released projections after live Linear state changes.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Task/spec lifecycle | Terminal, archived, or done rows still counted as active freshness/fallback/provider-worker blockers | remove fallback | CO-552 | Active gates see terminal or archived rows as live obligations without explicit reopen evidence | 2026-05-17 | 2026-05-20 | 0 days after implementation | One canonical lifecycle model drives freshness, fallback expiry, and provider-worker blocking | lifecycle classifier tests plus `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` |
| Guard execution | Dry-run/non-dry selector or rule divergence | remove fallback | CO-552 | Dry-run skips validation semantics instead of writes only | 2026-05-17 | 2026-05-20 | 0 days after implementation | Shared selector/rule engine used by both execution modes | parity tests proving dry-run skips writes only |
| Fallback/refactor evidence | Guard-critical truth inferred from prose or fragile Markdown variants | remove fallback | CO-552 | Fallback metadata is incomplete, unparseable, or silently accepted | 2026-05-17 | 2026-05-20 | 0 days after implementation | Structured data or schema-validated parser fails closed | parser/schema tests plus docs packet fixtures |
| Review state | Cached or previous-head review approval treated as current | remove fallback | CO-552 | PR head SHA changes or review verdict is `unknown`/missing | 2026-05-17 | 2026-05-20 | 0 days after implementation | Current-head SHA-bound review state is required for clean handoff | review state tests and ready-review proof |
| Desired-state reconciliation | Stale provider-intake, retry/resume, process, branch, goal, or status cache outranks live authority | remove fallback | CO-552 | Cached claim or process state disagrees with live Linear/GitHub/control-host truth | 2026-05-17 | 2026-05-20 | 0 days after implementation | Reconciler reports or repairs drift and live terminal truth dominates cache | reconciler tests plus status monitor proof |
| Linear hygiene | Snapshot-only labels/relations treated as creation success | remove fallback | CO-552 with CO-509/CO-538 | Auto-created/reused issue lacks required labels or relations on live readback | 2026-05-17 | 2026-05-20 | 0 days after implementation | Live label/relation verification and reconciler failures are surfaced | Linear hygiene tests or dry-run/live-read evidence |

## Milestones & Sequencing
1. Draft the scoped docs-first packet from CO-552 issue text, comments, workpad, and parent-provided source anchor.
2. Parent imports the child patch, then completes registry/checklist mirrors under parent ownership.
3. Parent runs docs-review before implementation and chooses the first child implementation slice based on queue capacity and overlap risk.
4. First implementation slice should lock one authority boundary before widening. Candidate first slices are parent blocker/PR readiness guard, canonical lifecycle classifier, SHA-bound review state, or provider-intake live-state reconciler.
5. Parent launches focused child lanes only with disjoint file/phase scope and records acceptance or invalidation evidence.
6. Parent validates each slice with focused tests and then implementation-gate, standalone review, elegance pass, PR attachment, ready-review drain, and review-state handoff.

## Proposed Child Workstreams
1. Canonical task/spec lifecycle model and terminal-spec exclusion.
2. Authoritative guard contract for dry-run/non-dry parity and structured fallback/refactor metadata.
3. Desired-state reconciler for WIP caps, process leases, goals, shared-root posture, and stale worker branches.
4. SHA-bound Codex review automation with idempotent manual trigger and approval invalidation.
5. Linear hygiene reconciler building on CO-509 and CO-538 instead of replacing them.
6. Review-quality upgrade that proposes code changes and creator-loop changes against original spec and coding standards.

## Dependencies
- CO-543 immediate stale-cohort/pre-expiry repair remains separate from the umbrella refactor.
- CO-509 and CO-538 own narrower Linear label/relation creation and post-mutation verification scope.
- CO-520 remains the adjacent goals-mode owner; CO-552 should make goals subordinate to Linear/leases rather than duplicating CO-520.
- CO-522 and CO-553 evidence must remain strict: no blind `last_review` bump, no gate weakening, no duplicate owner creation.
- CO-554/CO-555 evidence informs typed landing exceptions and terminal Linear truth dominance.
- Current parent workpad owns the single active workpad, registry/checklist mirrors, PR lifecycle, and broader validation.

## Validation
- Checks / tests:
  - child lane: `git diff --check -- docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`
  - parent docs gate: docs-review before implementation after importing packet/mirrors
  - parent implementation gates: focused lifecycle, guard parity, fallback metadata, review SHA, reconciler, Linear hygiene, goals, and status-monitor regressions as files are selected
  - parent full lane validation per workpad before review handoff
- Rollback plan: parent can reject this child patch without touching registry/source/test files. After import, rollback is limited to the three packet docs plus any parent-owned mirror entries created from them.

## Risks & Mitigations
- Risk: CO-552 becomes a vague umbrella and fails to produce enforceable contracts.
  - Mitigation: each child workstream must name an authority source, a fail-closed behavior, and focused validation before implementation.
- Risk: immediate owners such as CO-522, CO-553, CO-554, or CO-555 get absorbed and become ambiguous.
  - Mitigation: keep CO-552 as recurrence/invariant owner and link narrower issues instead of replacing them.
- Risk: implementation adds another fallback seam.
  - Mitigation: require the CO-382 table and prefer removal or large refactor when authority is split.
- Risk: status proof is collected from the wrong root or branch.
  - Mitigation: distinguish branch-local proof from shared-root/control-host proof and require typed landing exceptions plus post-merge reruns.
- Risk: review state becomes stale after a push.
  - Mitigation: bind clean review to current head SHA and invalidate previous approvals on new heads.

## Acceptance Criteria
- [ ] Backlog packet defines one authoritative lifecycle model for active, blocked, terminal, archived, and reopened task/spec rows.
- [ ] Guard dry-run and non-dry execution share the same selector/rule engine, with tests proving dry-run skips writes only.
- [ ] Fallback/refactor metadata is represented by structured data or a schema-validated parser, with fragile prose/table variants fail-closed.
- [ ] Desired-state reconciler reports and/or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift.
- [ ] Codex review automation records current head SHA, approval/finding state, manual trigger attempts, and invalidates stale approvals on new heads.
- [ ] Linear issue auto-creation/reuse paths prove live labels and relations, linking to CO-509 and CO-538 rather than duplicating their scope.
- [ ] Review workflow checks original spec and coding standards, proposes code changes, and proposes changes to the creating agent loop.
- [ ] Status monitor displays issue, goal, process/agent, branch, review, and gate state without overlapping or duplicate goals.

## Approvals
- Reviewer: CO provider worker / parent CO-552 lane
- Date: 2026-05-20
