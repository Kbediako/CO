# PRD - CO-461 provider docs-review child-stream task identity guard compatibility

## Traceability
- Linear issue: `CO-461`
- Task id: `linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc`
- Canonical spec: `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- Task checklist: `tasks/tasks-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- Child lane manifest: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/manifest.json`
- Child lane patch artifact: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/provider-linear-child-lane.patch`
- Source anchor: `ctx:sha256:471c87a980984a9fa78484180d20caa0853870300b60d3719fd86502570efbfb#chunk:c000001`
- Source payload path from handoff: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/memory/source-0/source.txt`
- Source payload note: the payload is available in the parent run artifacts and carries run/issue lineage only; this packet uses the child-lane prompt as the issue-shaping contract.

## Summary
- Problem Statement: provider-launched `docs-review` child streams can produce a child run shaped like `task_id=linear-<issue-id>-docs-review` with `parent_run_id` set, but without accepted provider launch provenance. `delegation-guard` then treats the child task identity as unregistered or unsanctioned and fails before the review stage, even though the parent worker intended `docs-review` as its governed child stream.
- Desired Outcome: provider-launched `docs-review` child streams are guard-compatible without weakening strict top-level validation. A valid provider parent plus docs-review child passes through either inherited provider parent provenance/lineage or a registered parent task prefix that `delegation-guard` already accepts. Missing or mismatched provider provenance and ordinary unregistered top-level task ids still fail closed.

## User Request Translation
- User intent / needs: create the docs-first packet for `CO-461` so the parent can fix provider docs-review child-stream task identity and `delegation-guard` compatibility while preserving the existing fail-closed provider provenance contract.
- Success criteria / acceptance:
  - Regression setup reproduces the `CO-458` shape: child `task_id=linear-<issue-id>-docs-review`, `parent_run_id` set, no accepted provider launch provenance, and a `delegation-guard` failure.
  - Valid provider parent plus `docs-review` child clears `delegation-guard` through a documented parent/child identity contract.
  - Missing provider provenance still fails closed.
  - Mismatched provider provenance still fails closed.
  - Registered-parent-prefix mismatch still fails closed.
  - Ordinary unregistered top-level task ids remain rejected without provider-child diagnostics.
  - Guard and fix guidance names the correct parent/child task identity contract.
- Constraints / non-goals:
  - Do not edit source or tests in this docs-packet child lane.
  - Do not mutate Linear, workpad, GitHub, PR, or review lifecycle state from this child lane.
  - Do not use blanket `DELEGATION_GUARD_OVERRIDE_REASON` as the steady-state fix.
  - Do not weaken provider provenance checks, task registration checks, or parent-run continuity checks.
  - Do not run full repo validation suites from this child lane.

## Intent Checksum
- Exact user wording / phrases to preserve:
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
- Protected artifact and surface names:
  - `linear child-stream --pipeline docs-review`
  - `node scripts/delegation-guard.mjs`
  - `scripts/delegation-guard.mjs`
  - `scripts/lib/provider-run-contract.js`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `tests/delegation-guard.spec.ts`
  - `provider-linear-worker-child-streams.json`
  - `provider-intake-state.json`
  - `manifest.json`
  - `parent_run_id`
  - `provider_launch_source`
  - `provider_control_host_task_id`
  - `provider_control_host_run_id`
  - `provider_worker_child_stream_provenance_invalid`
- Nearby wrong interpretations to reject:
  - treating every `linear-<issue-id>-docs-review` child task as automatically valid without provider parent proof
  - allowing ordinary unregistered top-level task ids because they happen to look like Linear ids
  - accepting missing or mismatched provider launch provenance
  - dropping `parent_run_id` continuity as the parent/child lineage proof
  - replacing the failure with a permanent delegation-guard override
  - changing docs-review pipeline behavior unrelated to task identity and guard proof

## Parent / Child Identity Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-458 failure shape | A provider docs-review child can run as `linear-<issue-id>-docs-review` with `parent_run_id` but no accepted provider provenance, then fail `delegation-guard`. | This shape should be reproducible so the guard fix is anchored to the real failure. | Focused regression pins the failure before the fix path. | Reclassifying the failure as a docs-review content issue. |
| Valid provider parent | Provider parent identity is valid only when launch provenance and current lineage match. | Provider child tasks should inherit or reference that sanctioned parent identity. | Valid parent plus docs-review child passes without override text. | Accepting manifest issue fields alone as proof. |
| Registered parent prefix | Guard can recognize children under a registered parent task prefix. | Child task ids should use a parent prefix that guard can resolve. | If inherited provider proof is not the chosen contract, docs-review child task id uses a registered parent prefix. | Registering arbitrary child task ids to bypass parent truth. |
| Missing provider provenance | Provider child surfaces already fail closed when control-host provenance is absent. | Missing provider provenance is not a sanctioned parent identity. | Missing provenance still fails closed. | Silent fallback to top-level registration. |
| Mismatched provider provenance | Provider child surfaces fail closed when live env and manifest provenance diverge. | Mismatch means the child is not authorized by the current parent. | Mismatched provenance still fails closed. | Trusting stale or foreign control-host state. |
| Ordinary unregistered top-level task | Unregistered top-level task ids fail guard. | Provider-child allowance must not become a global unregistered-task bypass. | Ordinary unregistered top-level task ids still fail without provider-child diagnostics. | Any broad relaxation of `tasks/index.json` registration. |

## Not Done If
- The parent fix only adds override text or a guard waiver for provider docs-review runs.
- A valid provider parent plus docs-review child still fails `delegation-guard`.
- A child with `task_id=linear-<issue-id>-docs-review` passes without matching `parent_run_id` and sanctioned provider parent proof or a registered parent prefix.
- Missing provider provenance passes.
- Mismatched provider provenance passes.
- A registered-parent-prefix mismatch passes.
- Ordinary unregistered top-level task ids pass.
- The implementation changes Linear state, workpad behavior, PR lifecycle, or docs-review content semantics to avoid the guard failure.

## Goals
- Reproduce the CO-458 provider docs-review child-stream task identity failure in a focused regression.
- Define a guard-compatible parent/child identity contract for provider-launched docs-review child streams.
- Preserve strict `delegation-guard` behavior for ordinary unregistered top-level task ids.
- Preserve strict failure for missing or mismatched provider provenance.
- Add focused coverage for valid provider parent plus docs-review child, missing provenance, and registered-parent-prefix mismatch.

## Non-Goals
- No source, test, Linear, GitHub, PR, workpad, or review lifecycle edits in this child lane.
- No blanket `DELEGATION_GUARD_OVERRIDE_REASON` path as the product fix.
- No generic delegation-guard rewrite outside provider child task identity.
- No broad provider-worker launch redesign.
- No docs-review content, reviewer, or freshness behavior changes unless parent source inspection proves the guard contract cannot be isolated.

## Stakeholders
- Product: CO operators who expect provider-launched docs-review evidence to satisfy governed workflow checks.
- Engineering: provider worker, child-stream shell, delegation guard, provider-run contract, and review workflow maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - valid provider parent plus docs-review child clears `delegation-guard`
  - CO-458 failure shape is covered by regression setup
  - missing provenance, mismatched provenance, and registered-parent-prefix mismatch fail closed
  - ordinary unregistered top-level task ids still fail
  - guard diagnostics point to the parent/child identity contract rather than suggesting override text
- Guardrails / Error Budgets:
  - zero new acceptance of unregistered top-level task ids
  - zero acceptance of provider children without `parent_run_id` continuity
  - zero acceptance of missing or mismatched provider provenance
  - zero permanent guard override for routine provider docs-review child streams

## Technical Considerations
- Architectural Notes:
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts` launches allowlisted child streams and currently selects the docs-review child task id.
  - `scripts/delegation-guard.mjs` and `scripts/lib/provider-run-contract.js` own the guard-side definition of a sanctioned provider parent and child.
  - `provider-linear-worker-child-streams.json` records child stream lineage for provider-worker proof and should remain truthful.
  - The parent implementation should keep `parent_run_id` continuity central, then either propagate enough valid provider parent provenance for guard recognition or use a registered parent task prefix that makes the child relationship explicit.
- Dependencies / Integrations:
  - `linear child-stream --pipeline docs-review`
  - `codex-orchestrator start docs-review --task <task-id> --parent-run <run-id>`
  - provider worker manifest fields: `provider_launch_source`, `provider_control_host_task_id`, `provider_control_host_run_id`, `parent_run_id`
  - `tasks/index.json` task registration and parent-prefix detection

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider docs-review child task id | `linear-<issue-id>-docs-review` can be launched without enough guard-accepted parent identity. | expire fallback | CO-461 parent implementation | Provider worker launches `docs-review`. | existing provider child-stream behavior | 2026-05-01 | 30 days | Child task identity either inherits sanctioned provider parent lineage/provenance or uses a guard-registered parent prefix. | Focused valid-parent docs-review child regression clears `delegation-guard`. |
| Provider provenance failure | Missing or mismatched provider provenance fails closed. | justify retaining fallback | CO-461 parent implementation | Provider child or provider-started guard validation. | existing provider guard contract | 2026-05-01 | Non-expiring correctness contract | Replace only with stricter/equivalent provenance proof. | Missing and mismatched provenance regressions fail closed. |
| Ordinary top-level task registration | Unregistered top-level task ids fail guard. | justify retaining fallback | CO-461 parent implementation | `delegation-guard` validates task registration. | existing delegation guard contract | 2026-05-01 | Non-expiring correctness contract | Replace only with stricter/equivalent registration proof. | Ordinary unregistered top-level regression fails. |

- Durable retention evidence: strict provenance and task-registration failures are retained correctness contracts, not temporary bypasses.
- Large-refactor check: no large refactor is expected if the parent can make provider child task identity and guard proof agree at the child-stream launch or guard contract seam. Relaunch with widened ownership if source inspection proves the fix requires broader provider-worker launch restructuring.

## Open Questions
- Parent should choose whether to solve the mismatch by propagating valid provider parent provenance/lineage into the docs-review child or by changing the child task id to a registered parent prefix.
- Parent should decide whether the guard diagnostic should name the missing provider parent proof, the unregistered parent prefix, or both when the CO-458 shape recurs.

## Approvals
- Product: Linear CO-461, pending parent lane review
- Engineering: docs-review / parent implementation review, pending
- Design: N/A
