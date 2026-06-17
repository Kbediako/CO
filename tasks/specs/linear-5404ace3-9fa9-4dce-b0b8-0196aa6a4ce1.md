---
id: 20260531-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1
title: "CO-592 provider parent-proof rehydration"
relates_to: docs/PRD-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
related_action_plan: docs/ACTION_PLAN-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md
task_checklists:
  - tasks/tasks-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md
review_notes:
  - 2026-06-17: Reviewed CO-592 fallback metadata; kept the expiring rehydrated parent-proof seam on its existing 2026-06-30 deadline and preserved durable strict-proof/audit-retention dispositions.
---

# TECH_SPEC - CO-592 provider parent-proof rehydration

## Canonical Reference
- Linear issue: `CO-592` / `5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- PRD: `docs/PRD-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Task checklist: `tasks/tasks-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- `.agent` mirror: `.agent/task/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Source anchor: `ctx:sha256:82b6890ddb28df5fdb3ee033ffaeefd5d64ff61a39c34fe6c0fd1119ab0d1b87#chunk:c000001`

## Summary
- Objective: allow `delegation-guard` to recognize `rehydrated active provider claims` as `sanctioned provider parent proof` for matching `provider docs-review children`, without weakening CO-461 or CO-557.
- Scope: docs-first packet, guard contract, parent-proof criteria, negative proof shapes, parent-owned validation plan, and registry/checklist mirrors.
- Constraints: no source/test edits in this child lane; no Linear/GitHub/PR/workpad actions; parent owns docs-review, implementation, focused tests, final validation, and lifecycle handoff.

## Issue-Shaping Contract
- User-request translation carried forward: CO-592 must fix provider parent-proof rehydration for provider docs-review children. The guard may accept a rehydrated active parent only when the provider-intake claim and active parent manifest agree on task, issue, run, manifest, and root. The guard must not accept `parent_run_id` alone, stale, foreign, released, or unrelated claims.
- Protected terms / exact artifact and surface names:
  - `rehydrated active provider claims`
  - `sanctioned provider parent proof`
  - `provider docs-review children`
  - `delegation-guard`
  - `CO-461`
  - `CO-557`
  - `parent_run_id`
  - `parent_run_id alone`
  - `stale`
  - `foreign`
  - `released`
  - `unrelated claims`
  - `provider_issue_rehydrated_active_run`
  - `provider-intake-state.json`
  - `manifest.json`
  - `linear child-stream --pipeline docs-review`
  - `linear-<issue-id>-docs-review`
  - `node scripts/delegation-guard.mjs`
  - `tests/delegation-guard.spec.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `tasks/index.json`
  - `shared control-host artifact root`
  - `workspace-local .runs`
- Nearby wrong interpretations to reject:
  - `parent_run_id alone` is sufficient because it names the parent run.
  - a provider-looking task id or issue id is sufficient proof.
  - a stale parent run can authorize a newer docs-review child.
  - a foreign root or manifest `workspace_path` can supply provider-intake proof.
  - `released`, terminal, completed, retained, or unrelated claims count as active parent proof.
  - CO-592 should relax CO-461/CO-557 guard strictness.
  - a permanent `DELEGATION_GUARD_OVERRIDE_REASON` is an acceptable steady-state fix.
- Explicit non-goals carried forward:
  - no lifecycle mutation from this child lane.
  - no source/test edits from this child lane.
  - no broad provider-worker launch redesign.
  - no manual provider-intake repair or audit deletion.

## Parent-Proof Contract Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Rehydrated active parent | `provider_issue_rehydrated_active_run` can be current live control-host truth for a provider parent run. | Active proof must be same issue, same task, same run, same manifest, and current root. | Treat matching `rehydrated active provider claims` as `sanctioned provider parent proof`. | Any claim that lacks active parent manifest support. |
| Child lineage | `parent_run_id` links a child manifest to a parent run. | CO-461 says lineage alone is insufficient. | Require `parent_run_id` to match the sanctioned rehydrated parent run and require child issue fields to match when present. | `parent_run_id alone` acceptance. |
| Root authority | Guard can discover provider-intake state from current or shared roots. | CO-557 says foreign or stale root authority fails closed. | Rehydrated proof lookup must remain current-root/shared-root bounded. | Foreign manifest `workspace_path` authority. |
| Audit residue | Provider-intake history can contain stale, released, terminal, or retained rows. | Audit residue is visible history, not live authorization. | Exclude stale, foreign, released, terminal, completed, retained, and unrelated claims from parent proof. | Deleting or rewriting audit history. |
| Existing strictness | CO-461 and CO-557 protect provider docs-review task identity, registry proof, and artifact-root authority. | Strict failures are supported behavior. | Add one narrow valid proof source while keeping all strict negative cases. | Blanket task-key or provenance relaxation. |

## Readiness Gate
- Not done if:
  - `delegation-guard` accepts `parent_run_id alone`.
  - stale, foreign, released, terminal, completed, retained, or unrelated claims can authorize `provider docs-review children`.
  - a docs-review child passes without registered parent task proof in `tasks/index.json`.
  - child issue fields can mismatch the sanctioned parent.
  - a foreign workspace/root or stale manifest `workspace_path` can supply parent proof.
  - CO-461 missing/mismatched provenance, registered-prefix, or ordinary top-level rejection coverage regresses.
  - CO-557 docs-review task-key/root authority regresses.
  - the fix depends on manual `provider-intake-state.json` edits or permanent guard override text.
- Pre-implementation issue-quality review evidence:
  - 2026-05-31: this packet classifies CO-592 as a guard-contract parity lane, not a broad provider-worker redesign. Correctness depends on exact protected terms, provider parent proof criteria, and negative proof shapes, so the micro-task path is unavailable.
  - Source payload path from the prompt was not present in this child checkout; the packet preserves the source anchor and parent-provided issue contract.
- Safeguard ownership split: parent owns source, tests, docs-review, implementation, validation, Linear/workpad state, PR lifecycle, and final handoff; child owns only declared packet/registry files.

## Technical Requirements
- Functional requirements:
  1. Recognize `rehydrated active provider claims` as parent proof only when claim `state`, reason, provider, issue id, issue identifier, task id, run id, run manifest path, active parent manifest, and artifact root agree.
  2. Preserve existing launch-provenance proof when available and valid.
  3. Allow cleared launch provenance only for `provider_issue_rehydrated_active_run` rows that satisfy stronger active-run proof.
  4. Require provider docs-review child `parent_run_id` to match the sanctioned rehydrated parent run.
  5. Require child issue fields to match the sanctioned parent when child manifests carry issue fields.
  6. Reject stale parent runs before accepting any fallback provider-intake state.
  7. Reject foreign workspace/root provider-intake proof.
  8. Reject `released`, terminal, completed, retained, unrelated, and issue-mismatched claims.
  9. Preserve ordinary unregistered top-level task rejection.
  10. Preserve registered provider issue task key `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1` without suffixes in `tasks/index.json`.
- Non-functional requirements:
  - Keep implementation narrowly scoped to provider parent-proof lookup and diagnostics.
  - Prefer explicit fail-closed checks over broad task id pattern matching.
  - Preserve provider-intake audit history.
  - Keep diagnostics specific enough to distinguish missing proof, stale proof, foreign proof, released proof, and parent-run mismatch.
- Interfaces / contracts:
  - `node scripts/delegation-guard.mjs`
  - `tests/delegation-guard.spec.ts`
  - `provider-intake-state.json`
  - provider worker `manifest.json`
  - docs-review child `manifest.json`
  - `tasks/index.json`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated provider parent proof | `rehydrated active provider claims` may be ignored as parent proof when original control-host launch provenance was safely cleared during active-run rehydration. | expire fallback | CO-592 parent implementation | `provider docs-review children` run after parent provider-worker rehydration. | 2026-05-31 | 2026-06-17 | 30 days, expires 2026-06-30 | `delegation-guard` recognizes current same-issue, same-run, same-manifest, same-root rehydrated active parent proof without requiring a loose override. | Focused passing rehydrated active parent-proof regression plus existing CO-461/CO-557 guard matrix. |
| Strict provider child authorization | Contract name: `sanctioned provider parent proof` for `provider docs-review children`. | justify retaining fallback | Owning surface: `delegation-guard` / provider child-stream contract. | Provider docs-review child validation. | CO-461 / CO-557 | 2026-05-31 | Non-expiring rationale: strict rejection is correctness behavior, not temporary fallback behavior. | Steady-state proof: `parent_run_id alone`, stale, foreign, released, and unrelated proof fail closed. | Tests/docs: negative regressions for parent-run-only, stale, foreign, released, unrelated, issue mismatch, missing parent_run_id, and unregistered top-level task ids. |
| Provider intake audit residue | Contract name: provider-intake audit residue retention for retained/stale provider-intake rows. | justify retaining fallback | Owning surface: provider-intake audit history. | Guard scans provider-intake state for parent proof. | Existing provider-intake behavior | 2026-05-31 | Non-expiring rationale: retained audit history is durable evidence, not temporary fallback behavior. | Steady-state proof: audit rows stay visible but are excluded from sanctioned parent proof unless they satisfy active same-run proof requirements. | Tests/docs: released, stale, foreign, and unrelated rows fail closed while audit data remains unchanged. |

- 2026-06-17 fallback metadata review: the expiring rehydrated parent-proof seam remains active until the existing 2026-06-30 deadline; strict provider child authorization and provider-intake audit residue remain durable correctness/audit contracts, not temporary fallback bypasses.

- Contract name: strict rehydrated parent-proof authorization.
- Owning surface: `delegation-guard` and provider-intake parent proof lookup.
- Steady-state proof: `parent_run_id alone`, stale, foreign, released, unrelated, issue-mismatched, and ordinary unregistered top-level task ids fail closed.
- Tests/docs: `tests/delegation-guard.spec.ts`, CO-461 packet, CO-557 packet, and this CO-592 packet.
- Non-expiring rationale: strict provider parent proof is a correctness contract and should outlive this issue.
- Large refactor check: scoped guard/provider-intake proof extension is preferred. Relaunch only if parent source inspection proves proof authority is split across lifecycle phases beyond the declared parent scope.
- Minor seam decision: no loose proof seam is retained; the only compatibility is the expiring rehydrated-active proof path with stronger checks.

## Architecture & Data
- Add or adjust provider parent-proof collection in `scripts/delegation-guard.mjs`.
- Reuse existing current-root/shared-root resolution from CO-557.
- Treat `provider_issue_rehydrated_active_run` as eligible only when an active parent manifest supports the claim.
- Do not mutate provider-intake rows to make proof pass.
- Keep existing provider-started proof and provider docs-review task-key diagnostics.

## Validation Plan
- Tests / checks:
  - focused `tests/delegation-guard.spec.ts` valid rehydrated active provider parent proof success.
  - focused `tests/delegation-guard.spec.ts` parent-run-only failure.
  - focused stale parent run mismatch failure.
  - focused foreign workspace/root proof failure.
  - focused released/terminal/retained claim failure.
  - focused unrelated issue claim failure.
  - focused child issue mismatch failure.
  - focused missing `parent_run_id` failure.
  - existing CO-461 provider docs-review strictness regressions remain green.
  - existing CO-557 shared-root and foreign-root regressions remain green.
  - parent-owned docs-review before implementation and implementation-gate after source changes.
- Rollout verification:
  - parent workpad records docs packet import, docs-review manifest, focused guard tests, implementation validation, review evidence, PR lifecycle, and final handoff.
- Monitoring / alerts:
  - guard diagnostics should mention whether failure came from missing, stale, foreign, released, unrelated, or mismatched parent proof.

## Completion Criteria
- Docs packet and task registry use provider issue task key `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1` without title/retry/freshness suffixes.
- Rehydrated active parent proof is defined with strict same-run and same-root criteria.
- `parent_run_id alone`, stale, foreign, released, and unrelated claims remain rejected.
- Parent implementation preserves CO-461 and CO-557 guard strictness.
- Parent focused tests prove both the new valid path and the negative proof matrix.
