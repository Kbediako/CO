# ACTION_PLAN - Docs Relevance + Dummy Repo Validation Follow-up (0982)

## Summary
- Goal: make repository docs/task state accurate after 0981 merge and capture explicit dummy-repo simulation evidence.
- Scope: targeted docs/index/checklist updates + mock downstream validations + full gate rerun.
- Assumptions: existing runtime/provider behavior from 0981 remains intact; packaged CLI smoke remains available.

## Milestones & Sequencing
1) Docs-first scaffolding + registration
- Create PRD/TECH_SPEC/ACTION_PLAN/checklist mirrors for 0982.
- Register 0982 in `tasks/index.json` and add 0982 snapshot line in `docs/TASKS.md`.

2) Docs relevance corrections
- Apply high-signal stale-state fixes from delegated docs audit:
  - 0981 checklist handoff completion rows.
  - 0981 snapshot wording in `docs/TASKS.md`.
  - 0981/0980 status drift in `tasks/index.json`.

3) Dummy/simulated validation
- Execute `pack:smoke` with durable logs.
- Run dummy repo appserver->cli fallback review simulation.
- Run dummy repo unsupported cloud+appserver fail-fast simulation.

4) Final quality gates + PR lifecycle
- Run ordered 1-10 validation commands.
- Open PR, address feedback, monitor quiet window, merge and clean branch if unblocked.

## Dependencies
- Existing runtime provider implementation from task 0981.
- Existing scripts and CLI wrappers (`pack:smoke`, `review`, `start frontend-testing`).

## Validation
- Required checks/tests: ordered 1-10 gate list per repo policy.
- Rollback plan:
  - Revert follow-up docs/index edits if regressions are found.
  - No runtime default changes in this follow-up.

## Risks & Mitigations
- Risk: over-scoping docs changes.
  - Mitigation: strict high-signal-only edits with evidence.
- Risk: dummy simulations depend on local temp env.
  - Mitigation: keep scripts deterministic and archive logs/assertions.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
