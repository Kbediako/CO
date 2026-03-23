# ACTION_PLAN - Coordinator Symphony Current Linear Operational Parity

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: move CO from read-only Linear provider lifecycle parity to current Symphony operational Linear parity.
- Scope: implement worker-visible Linear mutation capability, workflow prompt/state contract parity, persistent workpad comment handling, PR/review/handoff state behavior, and the provider/runtime changes needed to support those flows.
- Scope note: the current branch also includes provider-worker proof auditability for helper-operation attempts/outcomes so live validation can distinguish local run success from Linear workflow success.
- Assumptions:
  - base scheduler truth from `1310` remains valid and should not be overwritten
  - current Symphony operational behavior is defined by the live Elixir repo, not only the base `SPEC.md`
  - the first implementation slice should stay narrow: worker-owned helper, workflow-state parity, and live validation before any broader follow-on

## Milestones & Sequencing
1. Keep `1318` registered and review-backed while converting the packet from planning-only to implementation.
2. Land the worker-visible Linear helper surface:
   - factor reusable GraphQL auth/timeout transport
   - add a provider Linear workflow facade
   - expose it through a narrow `codex-orchestrator linear ...` CLI with JSON output
3. Land workflow-state and prompt parity:
   - shared state map (`Todo`, `In Progress`, `Human Review` or live-team `In Review`, `Merging`, `Rework`, `Done`)
   - provider handoff eligibility aligned to that state map
   - provider worker prompts that enforce workpad, PR attachment, and handoff behavior
4. Validate remote workpad continuity and auditability:
   - reuse the current remote `## Codex Workpad` comment rather than inventing a new local source of truth
   - expose enough proof/read-model detail to debug workflow mutations if needed
5. Run the full validation floor, then execute one live Linear proof through `provider-linear-worker`, PR, review loop, merge, and clean-main closeout

## Dependencies
- Current Symphony authorities:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/live_e2e_test.exs`
  - `/Users/kbediako/Code/symphony/.codex/skills/linear/SKILL.md`
- Current CO boundaries:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`

## Validation
- Checks / tests:
  - docs lane: keep the packet in sync and rerun docs checks after implementation edits
  - implementation lane: full validation floor plus live Linear proof
- Rollback plan:
  - if the chosen helper surface proves wrong, revert the helper and prompt/state changes together rather than widening into generic runtime completion logic
  - if live validation shows only partial parity, re-slice from the current docs packet instead of bolting on ad hoc provider writes

## Risks & Mitigations
- Risk: misreading current Symphony as orchestrator-owned tracker write-back.
  - Mitigation: keep the two-layer authority split explicit in all docs.
- Risk: under-scoping the parity gap to one completion-state update.
  - Mitigation: plan for the full workflow contract including workpad, PR, and handoff states.
- Risk: assuming the live Linear team uses Symphony's exact `Human Review` label.
  - Mitigation: keep the canonical Symphony workflow names in docs while explicitly handling the proven live-team `In Review` handoff alias.
- Risk: overloading generic run-finalization with provider-specific Linear mutation logic.
  - Mitigation: keep write-back adjacent to provider worker/provider lifecycle boundaries.

## Approvals
- Reviewer: docs-review passed for `1318` in `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`.
- Date: 2026-03-22
