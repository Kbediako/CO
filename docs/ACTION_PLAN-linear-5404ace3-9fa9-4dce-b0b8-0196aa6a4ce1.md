# ACTION_PLAN - CO-592 Provider Parent-Proof Rehydration

## Summary
- Goal: define and implement a strict rehydrated parent-proof path so `rehydrated active provider claims` can authorize matching `provider docs-review children` without weakening `delegation-guard`.
- Scope: docs-first packet, provider parent-proof criteria, negative proof matrix, task registry, parent-owned guard implementation, focused tests, and validation.
- Assumptions:
  - parent lane owns live Linear state, workpad, docs-review, implementation, validation, PR lifecycle, and final handoff.
  - provider issue task key remains `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1` without issue-title, retry, or freshness suffixes.
  - this child lane only creates the docs-first packet and scoped registry mirrors.
  - source payload path from the prompt is absent in this child checkout, so parent owns source-payload reconciliation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `rehydrated active provider claims`, `sanctioned provider parent proof`, `provider docs-review children`, `delegation-guard`, `CO-461`, `CO-557`, `parent_run_id alone`, `stale`, `foreign`, `released`, and `unrelated claims`.
- Not done if:
  - `delegation-guard` accepts `parent_run_id alone`.
  - stale, foreign, released, terminal, completed, retained, or unrelated claims authorize `provider docs-review children`.
  - docs-review children pass without registered parent task proof in `tasks/index.json`.
  - child issue fields can mismatch the sanctioned parent.
  - foreign workspace/root proof or stale manifest `workspace_path` supplies parent proof.
  - CO-461 or CO-557 strictness regresses.
  - the fix uses manual `provider-intake-state.json` edits or permanent guard override text.
- Pre-implementation issue-quality review:
  - 2026-05-31: packet review classifies CO-592 as a guard-contract parity lane. Exact proof terms, exact guard surfaces, negative proof cases, and CO-461/CO-557 preservation are necessary for correctness. The micro-task path is unavailable.
- Fallback / refactor decision:
  - Applies: `Yes`, because provider proof rehydration touches fallback-like compatibility between original launch provenance and rehydrated active provider state.
  - Decision: expire the missing rehydrated-proof seam by adding an explicit, stricter rehydrated active parent proof path.
  - Durable retention evidence: strict rejection of `parent_run_id alone`, stale, foreign, released, and unrelated claims remains a non-expiring correctness contract.
- Delegation note:
  - This child lane is already a bounded same-issue child lane and the available subagent tool requires explicit user authorization for additional spawning. No nested subagent was launched; parent owns any further delegation.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated provider parent proof | `rehydrated active provider claims` may be ignored as parent proof when original control-host launch provenance was safely cleared during active-run rehydration. | expire fallback | CO-592 parent implementation | `provider docs-review children` run after parent provider-worker rehydration. | 2026-05-31 | 2026-05-31 | 30 days, expires 2026-06-30 | `delegation-guard` recognizes current same-issue, same-run, same-manifest, same-root rehydrated active parent proof without requiring a loose override. | Focused passing rehydrated active parent-proof regression plus existing CO-461/CO-557 guard matrix. |
| Strict provider child authorization | Contract name: `sanctioned provider parent proof` for `provider docs-review children`. | justify retaining fallback | Owning surface: `delegation-guard` / provider child-stream contract. | Provider docs-review child validation. | CO-461 / CO-557 | 2026-05-31 | Non-expiring rationale: strict rejection is correctness behavior, not temporary fallback behavior. | Steady-state proof: `parent_run_id alone`, stale, foreign, released, and unrelated proof fail closed. | Tests/docs: negative regressions for parent-run-only, stale, foreign, released, unrelated, issue mismatch, missing parent_run_id, and unregistered top-level task ids. |
| Provider intake audit residue | Contract name: provider-intake audit residue retention for retained/stale provider-intake rows. | justify retaining fallback | Owning surface: provider-intake audit history. | Guard scans provider-intake state for parent proof. | Existing provider-intake behavior | 2026-05-31 | Non-expiring rationale: retained audit history is durable evidence, not temporary fallback behavior. | Steady-state proof: audit rows stay visible but are excluded from sanctioned parent proof unless they satisfy active same-run proof requirements. | Tests/docs: released, stale, foreign, and unrelated rows fail closed while audit data remains unchanged. |

## Milestones & Sequencing
1. [x] Create docs-first packet and register the task key.
   - Files: PRD, canonical task spec, TECH_SPEC mirror, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, and `docs/TASKS.md`.
   - Acceptance: protected terms, wrong interpretations, explicit non-goals, `Not Done If`, parent-proof matrix, fallback/seam decision, and validation plan are explicit.
2. [ ] Parent docs-review before implementation.
   - Evidence key: `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1-docs-review`.
   - Acceptance: docs-review accepts the packet or parent records and fixes findings.
3. [ ] Parent implements strict rehydrated active parent-proof recognition in `delegation-guard`.
   - Acceptance: matching `provider_issue_rehydrated_active_run` parent claim can authorize the matching docs-review child when task, issue, run, manifest, and root agree.
4. [ ] Parent adds negative guard regressions.
   - Acceptance: `parent_run_id alone`, stale, foreign, released, unrelated, issue mismatch, missing parent_run_id, and unregistered top-level shapes fail closed.
5. [ ] Parent preserves CO-461/CO-557 coverage.
   - Acceptance: existing provider docs-review child identity, shared-root, and foreign-root tests remain green.
6. [ ] Parent runs focused tests, required validation floor, review, PR lifecycle, feedback drain, and Linear handoff.

## Dependencies
- `node scripts/delegation-guard.mjs`
- `tests/delegation-guard.spec.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `provider-intake-state.json`
- provider parent `manifest.json`
- docs-review child `manifest.json`
- `tasks/index.json`
- CO-461 provider docs-review child-stream guard compatibility
- CO-557 provider docs-review task-key and control-host root authority

## Validation
- Checks / tests:
  - scoped docs packet checks in this child lane
  - parent-owned docs-review before implementation
  - focused valid rehydrated active parent-proof test
  - focused parent-run-only failure test
  - focused stale parent proof failure test
  - focused foreign root proof failure test
  - focused released/terminal/retained proof failure test
  - focused unrelated issue proof failure test
  - focused child issue mismatch test
  - focused missing `parent_run_id` test
  - existing CO-461 and CO-557 guard/root tests
  - parent final validation floor and review gates after source changes
- Rollback plan:
  - revert the guard-side rehydrated proof extension if any loose proof shape passes; keep the strict existing CO-461/CO-557 behavior.

## Risks & Mitigations
- Risk: parent-run lineage is mistaken for full proof.
  - Mitigation: explicitly test `parent_run_id alone` as rejected.
- Risk: stale or foreign provider-intake state authorizes the child.
  - Mitigation: keep CO-557 current-root/shared-root authority and add stale/foreign negative tests.
- Risk: released audit rows become live authority.
  - Mitigation: test `released`, terminal, completed, and retained rows as rejected.
- Risk: the fix weakens CO-461.
  - Mitigation: run existing provider docs-review child identity regressions and keep strict diagnostics.
- Risk: provider-intake history is hidden by manual cleanup.
  - Mitigation: preserve audit rows and make guard selection stricter instead of editing history.

## Approvals
- Reviewer: parent lane.
- Date: 2026-05-31.
