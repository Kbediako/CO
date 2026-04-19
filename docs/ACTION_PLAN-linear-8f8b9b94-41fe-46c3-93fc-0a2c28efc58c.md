# ACTION_PLAN - Control host: reconcile resumed provider-worker retry acceptance and CO STATUS truth after a failed prior attempt

## Summary
- Goal: give the parent lane a bounded implementation plan for the resumed provider-worker reconciliation shape where a failed prior attempt must not keep dominating retry acceptance, control-host intake, manifest/proof/summary truth reconciliation, or `CO STATUS`.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned precedence implementation, and parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - the bounded handoff wording is authoritative for the issue checksum
  - the smallest correct fix is one shared precedence rule, not multiple surface-specific overrides

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `resumed provider-worker runs`
  - `failed prior attempt`
  - `retry acceptance`
  - `control-host refresh failure history`
  - `control-host intake`
  - `CO STATUS`
  - `manifest/proof/summary truth reconciliation`
  - `provider-intake-state.json`
  - `provider-linear-worker-proof.json`
- Not done if:
  - resumed provider-worker runs are still rejected or misclassified because a failed prior attempt remains authoritative
  - retry acceptance still follows stale failed-attempt residue
  - control-host refresh failure history still outranks current resumed-run truth
  - manifest/proof/summary truth reconciliation still leaves stale failed-attempt truth dominant
  - `CO STATUS` still reports the failed prior attempt instead of the current resumed run
- Pre-implementation issue-quality review:
  - 2026-04-18: the bounded handoff wording makes this a cross-surface truth-reconciliation lane, not a retry-only or status-only lane. The packet preserves the exact issue checksum and rejects widening into redesign work.

## Milestones & Sequencing
1. Create the docs-first packet and mirrors for `CO-222` within the declared docs scope.
2. Parent audits the likely authority seams in `providerIssueHandoff.ts`, `providerLinearWorkerRunner.ts`, `providerIssueObservability.ts`, `selectedRunProjection.ts`, and `controlRuntime.ts`.
3. Parent identifies the smallest shared precedence rule for current resumed-run truth versus stale failed-attempt residue.
4. Parent applies that precedence rule where retry acceptance consumes control-host intake and run truth.
5. Parent applies the same rule where manifest/proof/summary truth reconciliation shapes `CO STATUS` and adjacent read models.
6. Parent adds focused regressions proving the current resumed run becomes authoritative without deleting failed prior attempt evidence.
7. Parent verifies failed prior attempt history remains auditable but demoted from current authority.
8. Parent runs focused validation and docs-review, then carries the packet into its normal review/PR path.

## Dependencies
- Shared source anchor: `ctx:sha256:6c2fdaf4cabe0fb0a183c2574b434ee4b063ceab0a04e0e592aad4c44d81b205#chunk:c000001`
- Origin manifest: `.runs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c-co222-docs-packet/cli/2026-04-17T16-32-33-651Z-8f6278d1/manifest.json`
- Likely parent implementation seams:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
- Likely parent focused tests:
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`

## Validation
- Child lane only:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`
  - `rg -n "resumed provider-worker runs|failed prior attempt|retry acceptance|control-host refresh failure history|control-host intake|CO STATUS|manifest/proof/summary truth reconciliation|parity matrix current/reference/target contract" docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/tasks-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md .agent/task/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
  - `git diff --check -- docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/tasks-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md .agent/task/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/index.json docs/TASKS.md`
- Parent implementation lane:
  - focused retry-acceptance and intake reconciliation regressions
  - focused manifest/proof/summary truth reconciliation and `CO STATUS` regressions
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits
- Rollback plan:
  - revert the shared precedence rule if it breaks current resumed-run truth or hides failed-attempt audit history

## Risks & Mitigations
- Risk: the fix lands as separate overrides in intake and `CO STATUS`, causing drift later.
  - Mitigation: force one shared precedence rule in the packet.
- Risk: stale failed-attempt evidence is deleted instead of demoted.
  - Mitigation: keep failed prior attempt evidence as explicit retained audit history in the issue contract.
- Risk: the lane widens into redesign work.
  - Mitigation: keep explicit non-goals and not-done-if bullets in every packet artifact.

## Approvals
- Docs packet child lane: `.runs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c-co222-docs-packet/cli/2026-04-17T16-32-33-651Z-8f6278d1/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
