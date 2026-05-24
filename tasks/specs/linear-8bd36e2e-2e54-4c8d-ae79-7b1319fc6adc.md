---
id: 20260501-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc
title: "CO-461 provider docs-review child-stream task identity guard compatibility"
relates_to: docs/PRD-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md
risk: high
owners:
  - Codex
last_review: 2026-05-01
related_action_plan: docs/ACTION_PLAN-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md
task_checklists:
  - tasks/tasks-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md
---

# TECH_SPEC - CO-461 provider docs-review child-stream task identity guard compatibility

## Canonical Reference
- PRD: `docs/PRD-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- Canonical task spec: `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- Task checklist: `tasks/tasks-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- Linear issue: `CO-461`
- Source anchor: `ctx:sha256:471c87a980984a9fa78484180d20caa0853870300b60d3719fd86502570efbfb#chunk:c000001`
- Child lane manifest: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/manifest.json`
- Patch artifact: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/provider-linear-child-lane.patch`

## Summary
- Objective: make provider-launched `docs-review` child streams compatible with `delegation-guard` task identity rules without weakening strict provider provenance or ordinary task registration behavior.
- Scope:
  - provider docs-review child task identity contract
  - provider parent lineage/provenance handoff to the docs-review child
  - `delegation-guard` recognition of valid provider parent plus docs-review child
  - focused regressions for the CO-458 failure shape, valid parent, missing provenance, and registered-parent-prefix mismatch
  - no source/test edits in this docs-only child lane
- Constraints:
  - preserve strict failure for ordinary unregistered top-level task ids
  - preserve strict failure for missing or mismatched provider provenance
  - preserve `parent_run_id` as the child-to-parent lineage key
  - parent owns source, tests, validation, Linear state, workpad, PR lifecycle, and review handoff

## Issue-Shaping Contract
- User-request translation carried forward: `CO-461` must fix the task identity mismatch where provider-launched `docs-review` children can be shaped like `linear-<issue-id>-docs-review` with `parent_run_id` set but no accepted provider launch provenance, causing `delegation-guard` failure. The fix must establish a guard-compatible parent/child task contract while retaining strict fail-closed behavior for unregistered top-level ids and invalid provider provenance.
- Protected terms / exact artifact and surface names:
  - `CO-458 shape`
  - `child task_id=linear-<issue-id>-docs-review`
  - `parent_run_id set`
  - `no accepted provider launch provenance`
  - `delegation-guard failure`
  - `provider-launched docs-review child streams`
  - `valid parent provider provenance/lineage`
  - `registered parent task prefix`
  - `ordinary unregistered top-level task ids`
  - `missing or mismatched provider provenance`
  - `registered-parent-prefix mismatch`
  - `parent/child task identity contract`
  - `linear child-stream --pipeline docs-review`
  - `node scripts/delegation-guard.mjs`
  - `scripts/delegation-guard.mjs`
  - `scripts/lib/provider-run-contract.js`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `tests/delegation-guard.spec.ts`
  - `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `provider-linear-worker-child-streams.json`
  - `provider-intake-state.json`
  - `parent_run_id`
  - `provider_launch_source`
  - `provider_control_host_task_id`
  - `provider_control_host_run_id`
  - `provider_worker_child_stream_provenance_invalid`
- Nearby wrong interpretations to reject:
  - `linear-<issue-id>-docs-review` is always valid because it looks like a child task
  - any Linear-looking unregistered top-level task should pass guard
  - issue id or issue identifier fields alone are enough provider parent proof
  - missing provider launch provenance can be treated as a docs-review fallback
  - mismatched provider provenance can be ignored when `parent_run_id` is present
  - `DELEGATION_GUARD_OVERRIDE_REASON` is an acceptable steady-state fix
- Explicit non-goals carried forward:
  - no Linear, workpad, GitHub, PR, or review lifecycle mutation from this child lane
  - no source/test edits from this child lane
  - no full repo validation from this child lane
  - no broad rewrite of docs-review, provider-worker, or delegation guard behavior outside this task identity contract

## Parent / Child Identity Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-458 failure shape | `linear-<issue-id>-docs-review` plus `parent_run_id` can still fail guard when accepted provider provenance is absent. | The real failure must stay reproducible. | Regression creates this shape and verifies guard fails before the sanctioned fix path is applied. | Treating this as reviewer or docs freshness failure. |
| Provider parent proof | Valid provider parents require launch provenance and lineage, not issue fields alone. | Child streams inherit or reference sanctioned parent proof. | Valid provider parent plus docs-review child clears `delegation-guard`. | Trusting stale or foreign provider state. |
| Registered parent prefix | Guard accepts child task ids under registered parent prefixes. | Parent prefix choice must be deliberate and auditable. | Docs-review child either uses inherited provider parent proof or a registered parent task prefix. | Registering arbitrary children as independent top-level tasks. |
| Missing provenance | Missing provider provenance is not a sanctioned parent identity. | Guard and child-stream shells fail closed. | Missing provenance remains rejected. | Silent fallback to a provider-shaped child id. |
| Mismatched provenance | Mismatched live env and manifest provenance is unauthorized. | Fail closed with clear diagnostics. | Mismatched provenance remains rejected. | Env-only overrides or stale parent claims. |
| Ordinary unregistered top-level task ids | Task ids absent from `tasks/index.json` fail guard. | Provider-child allowance is not a global top-level bypass. | Ordinary unregistered top-level ids still fail without provider-child diagnostics. | Broad registration relaxation. |

## Readiness Gate
- Not done if:
  - the CO-458 failure shape is not covered by a focused regression
  - valid provider parent plus docs-review child still fails guard
  - missing provider provenance passes
  - mismatched provider provenance passes
  - registered-parent-prefix mismatch passes
  - ordinary unregistered top-level task ids pass
  - the fix relies on permanent `DELEGATION_GUARD_OVERRIDE_REASON`
- Pre-implementation issue-quality review evidence:
  - 2026-05-01: the packet is not narrower than the user request because it names the CO-458 reproduction shape, the valid-provider success path, all requested fail-closed cases, and the guard guidance requirement.
  - 2026-05-01: micro-task path is unavailable because correctness depends on exact task identity, exact provider lineage/provenance surfaces, and fallback/seam behavior in provider docs-review child streams.
- Safeguard ownership split:
  - parent lane owns `scripts/delegation-guard.mjs`, `scripts/lib/provider-run-contract.js`, `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, tests, validation, Linear state, workpad, PR lifecycle, and review handoff
  - this child lane owns only docs/task packet files declared in scope

## Technical Requirements
- Functional requirements:
  - Reproduce the CO-458 shape in focused guard coverage: child `task_id=linear-<issue-id>-docs-review`, `parent_run_id` set, no accepted provider launch provenance, and `delegation-guard` failure.
  - Ensure a valid provider parent plus docs-review child clears `delegation-guard`.
  - Ensure the child identity contract uses either inherited valid provider parent provenance/lineage or a registered parent task prefix accepted by guard.
  - Parent run ID continuity: required for provider docs-review child recognition.
  - Missing provider provenance: fail-closed.
  - Mismatched provider provenance: fail-closed.
  - Registered-parent-prefix mismatch: fail-closed.
  - Ordinary unregistered top-level task ids: fail-closed without provider-child diagnostics.
  - Provider child-stream records: truthful in `provider-linear-worker-child-streams.json`.
- Non-functional requirements:
  - Keep the implementation narrow to provider docs-review child task identity and guard recognition.
  - Prefer explicit parent/child contract checks over broad task id pattern matching.
  - Preserve existing diagnostics where possible, but update guidance to point to the correct parent/child identity contract.
  - Avoid extra provider state mutation beyond the existing manifest/child-stream records required for the contract.
- Interfaces / contracts:
  - `linear child-stream --pipeline docs-review` should launch or record a child task id that guard can associate with its sanctioned parent.
  - `node scripts/delegation-guard.mjs` should distinguish valid provider child runs from ordinary unregistered top-level runs.
  - Provider child authorization should require `parent_run_id` plus sanctioned provider parent proof or registered parent-prefix proof.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider docs-review child task id | `linear-<issue-id>-docs-review` child task identity can launch without enough guard-accepted parent identity. | expire fallback | CO-461 parent implementation | Provider workflow launches `docs-review` child streams. | 2026-05-01 | 2026-05-15 | 2026-05-31 | Child task identity inherits sanctioned provider parent lineage/provenance or uses a guard-registered parent prefix. | Focused valid-parent docs-review child regression clears `delegation-guard`. |
| Delegation guard strict failure contracts | Contract name: provider docs-review strict provenance and registration guard | justify retaining fallback | Owning surface: `scripts/delegation-guard.mjs` | Steady-state proof: missing provenance, mismatched issue identity, and ordinary unregistered top-level task ids fail closed. | 2026-05-01 | 2026-05-15 | Non-expiring durable retention only with rationale | Non-expiring rationale: strict provenance and task registration are supported correctness contracts, not temporary fallback behavior. | Tests/docs: missing provenance, issue mismatch, registered-prefix mismatch, and ordinary top-level registration regressions. |

- Contract name: provider docs-review strict provenance and registration guard.
- Owning surface: `scripts/delegation-guard.mjs`.
- Steady-state proof: missing provenance, mismatched issue identity, and ordinary unregistered top-level task ids fail closed.
- Tests/docs: missing provenance, issue mismatch, registered-prefix mismatch, and ordinary top-level registration regressions.
- Non-expiring rationale: strict provenance and task registration are supported correctness contracts, not temporary fallback behavior.
- Large refactor: scoped child-stream task id construction and guard-side provider contract recognition are sufficient. Relaunch only if the parent proves task identity cannot be made consistent without a broader provider-worker launch redesign.
- Minor seam: acceptable only with the bounded expiry and durable strict-failure contract above.

## Architecture & Data
- Architecture / design adjustments:
  - Inspect `orchestrator/src/cli/providerLinearChildStreamShell.ts` for docs-review child task id construction and launch env shaping.
  - Inspect `scripts/delegation-guard.mjs` and `scripts/lib/provider-run-contract.js` for provider-child recognition and registered parent-prefix logic.
  - Keep `orchestrator/src/cli/providerLinearWorkerRunner.ts` child-stream record handling aligned with the chosen identity contract.
  - Add diagnostics that name the required parent/child task identity contract when guard rejects provider docs-review children.
- Data model changes / migrations:
  - No persisted migration expected.
  - Child stream records may need to preserve any chosen parent-prefix or provider lineage metadata already available from manifests.
- External dependencies / integrations:
  - Control-host provider-intake state.
  - Provider worker manifest lineage/provenance.
  - Task registry in `tasks/index.json`.
  - Docs-review child run manifests.

## Validation Plan
- Tests / checks:
  - focused `tests/delegation-guard.spec.ts` reproduction for the CO-458 failure shape
  - focused `tests/delegation-guard.spec.ts` valid provider parent plus docs-review child success
  - focused missing provider provenance fail-closed regression
  - focused mismatched provider provenance fail-closed regression
  - focused registered-parent-prefix mismatch fail-closed regression
  - focused ordinary unregistered top-level task id fail-closed regression
  - `orchestrator/tests/ProviderLinearChildStreamShell.test.ts` coverage for the chosen launch-side task identity contract
  - parent should run narrow focused tests first, then parent-selected repo validation/review gates before handoff
- Rollout verification:
  - parent workpad records child-lane docs packet acceptance, implementation patch, focused guard/child-stream tests, validation, review evidence, PR update, and docs-review child-stream proof
- Monitoring / alerts:
  - no runtime monitor required beyond parent-owned provider worker and PR/review handoff checks

## Open Questions
- Parent should decide whether to carry valid provider parent provenance/lineage into the child environment or switch docs-review child task ids to a registered parent prefix.
- Parent should decide whether diagnostics should prefer "missing provider parent provenance" or "unregistered parent prefix" when both are true.

## Approvals
- Reviewer: docs-review / parent implementation review pending
- Date: 2026-05-01
