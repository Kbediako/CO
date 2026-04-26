# PRD - CO-381 split runtime fallback routing into explicit auto and strict modes

## Traceability
- Linear issue: `CO-381` / `9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7`
- Linear URL: https://linear.app/asabeko/issue/CO-381
- Task id: `linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7`
- Canonical spec: `tasks/specs/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- Task checklist: `tasks/tasks-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- Source anchor: `ctx:sha256:788ef44aebc402efe831ec3c10edf00a79653a06d72a8a43cc83c841572629b6#chunk:c000001`
- Source payload: `.runs/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7-docs-packet/cli/2026-04-26T00-20-46-760Z-f04d6b8b/memory/source-0/source.txt`
- Source payload note: this child workspace does not contain the referenced `.runs` tree, so this packet is anchored on the parent handoff, issue title, source anchor, and explicit child-lane instructions.

## Summary
- Problem Statement: runtime fallback routing currently behaves as an implicit compatibility path. Operators can see `runtime_fallback` telemetry after a reroute, but the policy choice is not modeled as an explicit operator-facing `auto` or `strict` selection, and downstream provider-worker/control-host surfaces can miss a durable statement of the selected policy, original target, fallback target, and blocking reason.
- Desired Outcome: split runtime fallback routing into an explicit two-mode contract. `auto` keeps compatible rerouting when a requested runtime target is blocked and records the fallback. `strict` fails fast when the original target is blocked and prevents fallback routing. Both modes must preserve auditable fields for selected policy, original target, fallback target, and blocking reason.

## User Request Translation
- User intent / needs: create the docs-first packet for CO-381 before implementation so the parent lane can change runtime fallback behavior without drifting into silent reroutes, vague manifest fields, or broad runtime redesign.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, `.agent` mirror, and `tasks/index.json` registration exist for `linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7`
  - packet preserves the protected terms `auto`, `strict`, selected policy, original target, fallback target, and blocking reason
  - TECH_SPEC defines the shared runtime fallback policy contract and likely implementation surfaces
  - ACTION_PLAN sequences docs-review, implementation, focused tests, validation floor, standalone review, elegance review, and PR handoff
  - child lane does not edit production source, tests, Linear state, workpad, or PR lifecycle
- Constraints / non-goals:
  - only docs/checklist/registry files declared in the child-lane scope may change here
  - no Linear mutation helpers from this lane
  - no production source or test edits from this lane
  - no full repo validation suites from this lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-381`
  - `CO: split runtime fallback routing into explicit auto and strict modes`
  - `auto`
  - `strict`
  - `selected policy`
  - `original target`
  - `fallback target`
  - `blocking reason`
  - `runtime fallback routing`
- Protected terms / exact artifact and surface names:
  - `runtime_fallback`
  - `runtime_mode_requested`
  - `runtime_mode`
  - `runtime_provider`
  - `CliRuntimeProvider`
  - `AppServerRuntimeProvider`
  - `CODEX_ORCHESTRATOR_RUNTIME_FALLBACK`
  - `orchestrator/src/cli/runtime/provider.ts`
  - `orchestrator/src/cli/runtime/types.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionRouteState.ts`
  - `orchestrator/src/cli/services/orchestratorRuntimeManifestMutation.ts`
  - `orchestrator/src/cli/services/orchestratorLocalRouteShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
- Nearby wrong interpretations to reject:
  - "auto" means unaudited silent fallback
  - "strict" means disabling appserver globally
  - fallback policy can be inferred from `runtime_mode_requested != runtime_mode` without a named selected policy
  - cloud execution fallback and runtime fallback are the same contract
  - provider-worker or control-host surfaces can omit the blocking reason because the manifest has a generic fallback code
  - this docs child lane should implement runtime source or test changes

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Runtime fallback policy | Runtime fallback is effectively allowed unless `CODEX_ORCHESTRATOR_RUNTIME_FALLBACK` disables it, with false-like values including `strict`. | Operator-facing policies should be explicit and auditable. | A normalized selected policy is always `auto` or `strict`; compatibility aliases can map into the new policy but do not remain the primary contract. | Adding a third policy mode or changing the default runtime mode. |
| Runtime target selection | Runtime selection records `requested_mode`, `selected_mode`, provider, env overrides, session id, and `runtime_fallback` metadata. | Fallback decisions need source, target, and reason fields that survive manifest/read-model/proof projections. | Runtime fallback records selected policy, original target, fallback target, and blocking reason. | Renaming `cli` or `appserver`, removing `runtime_mode_requested`, or removing provider names. |
| `auto` behavior | Appserver preflight failures can reroute to `cli` when fallback is allowed. | Existing compatibility should remain available when operators choose an automatic fallback policy. | `auto` reroutes from blocked original target to fallback target, records the blocking reason, and continues under the selected fallback target. | Treating `auto` as permission to hide the fallback from summaries, manifests, or control-host views. |
| `strict` behavior | Fallback can be disabled through environment values, but this is not a first-class policy contract across surfaces. | Strict lanes should fail fast instead of changing execution/runtime targets under the operator. | `strict` stops before launching a fallback target, records the original target and blocking reason, and returns a clear actionable failure. | Retrying under `cli`, mutating Linear state, or launching provider workers after a strict runtime block. |
| Provider-worker/control-host evidence | Provider worker and control-host surfaces consume run/proof/manifest telemetry and can classify fallback-adjacent states. | Parent operators need the same fallback policy truth across manifest, proof, status, and control-host views. | Worker proof and control-host/read-model projections expose the selected policy, original target, fallback target, and blocking reason when fallback routing is considered. | Reworking queue ownership, issue handoff, or control-host polling policy outside runtime fallback evidence. |

## Not Done If
- The implementation can reroute runtime targets without a visible `auto` selected policy.
- `strict` still launches a fallback target after the original target is blocked.
- Runtime fallback telemetry omits selected policy, original target, fallback target, or blocking reason.
- Provider-worker or control-host views disagree with the manifest/runtime selection contract.
- Tests only assert final runtime mode and do not assert the policy and reason fields.
- CO-381 broadens into new runtime modes, global default flips, or unrelated cloud fallback behavior.

## Goals
- Define a first-class `auto` and `strict` runtime fallback policy.
- Preserve existing automatic compatibility behavior under `auto`.
- Make strict fail-fast behavior explicit, testable, and operator-visible.
- Keep manifest, router, provider-worker, and control-host/read-model fallback truth aligned.
- Provide a focused parent implementation and validation plan.

## Non-Goals
- No new runtime modes beyond `cli` and `appserver`.
- No change to the local default runtime mode.
- No removal of `runtimeMode=cli` break-glass behavior.
- No rewrite of execution-mode cloud fallback policy.
- No provider queue, Linear issue mutation, or PR lifecycle changes from this docs lane.
- No production source or test edits from this docs lane.

## Stakeholders
- Product: CO operators choosing whether fallback should be automatic or fail-fast.
- Engineering: runtime provider, execution router, provider worker, control-host, status/read-model, and test owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - `auto` and `strict` are represented as explicit selected policies in the runtime fallback contract
  - strict lanes fail before fallback launch and include an actionable blocking reason
  - auto lanes continue current compatibility fallback while making the reroute visible
  - focused regression tests cover policy parsing, runtime selection, router propagation, summaries/status, and provider-worker/control-host evidence
- Guardrails / Error Budgets:
  - zero silent fallback after policy split
  - zero production/test changes in this child lane
  - no full validation suites in this child lane

## Technical Considerations
- Architectural Notes:
  - Existing runtime selection lives in `orchestrator/src/cli/runtime/provider.ts` and returns a `RuntimeSelection`.
  - Existing manifest projection uses `runtime_mode_requested`, `runtime_mode`, `runtime_provider`, and `runtime_fallback`.
  - Parent implementation should prefer a shared policy normalization helper instead of duplicating alias parsing in router/provider-worker/control-host code.
- Dependencies / Integrations:
  - CLI/env/config policy parsing
  - runtime provider preflight and fallback selection
  - local route summary propagation
  - provider worker proof hydration
  - control-host/status/read-model projections

## Validation Plan
- Docs child lane:
  - JSON parse check for `tasks/index.json`
  - scoped diff/status review to confirm only declared files changed
- Parent implementation lane:
  - docs-review before implementation
  - focused runtime/provider/router tests for `auto` and `strict`
  - focused provider-worker/control-host tests for policy/reason projection
  - validation floor required by the parent lane
  - standalone review and elegance review before PR handoff

## Open Questions
- Should the new operator-facing setting be exposed as a new env/config key, while `CODEX_ORCHESTRATOR_RUNTIME_FALLBACK` remains a compatibility alias?
- Should manifest fields use exact snake_case names `selected_policy`, `original_target`, `fallback_target`, and `blocking_reason`, or should those names live inside a nested runtime fallback policy object?

## Approvals
- Product: parent CO-381 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
