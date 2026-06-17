---
id: 20260426-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7
title: "CO: split runtime fallback routing into explicit auto and strict modes"
relates_to: docs/PRD-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
related_action_plan: docs/ACTION_PLAN-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md
task_checklists:
  - tasks/tasks-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- Task checklist: `tasks/tasks-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- Source anchor: `ctx:sha256:788ef44aebc402efe831ec3c10edf00a79653a06d72a8a43cc83c841572629b6#chunk:c000001`

## Summary
- Objective: define the implementation contract for splitting runtime fallback routing into explicit `auto` and `strict` modes.
- Scope:
  - runtime fallback policy normalization and aliases
  - runtime provider selection and manifest mutation
  - execution router/local route propagation
  - provider-worker proof/readback surfaces
  - control-host/status projection of runtime fallback policy truth
- Constraints:
  - this child lane is docs-only
  - parent owns source/test implementation, Linear state, workpad, PR lifecycle, and full validation
  - no new runtime modes
  - no silent fallback after the policy split

## Issue-Shaping Contract
- User-request translation carried forward: CO-381 requires runtime fallback routing to become an explicit policy decision with two valid selected policies, `auto` and `strict`, and all fallback decisions must carry selected policy, original target, fallback target, and blocking reason through the operator-visible surfaces.
- Protected terms / exact artifact and surface names:
  - `auto`
  - `strict`
  - `selected policy`
  - `original target`
  - `fallback target`
  - `blocking reason`
  - `runtime_fallback`
  - `runtime_mode_requested`
  - `runtime_mode`
  - `runtime_provider`
  - `CliRuntimeProvider`
  - `AppServerRuntimeProvider`
  - `CODEX_ORCHESTRATOR_RUNTIME_FALLBACK`
- Nearby wrong interpretations to reject:
  - `auto` allows invisible fallback
  - `strict` is a global runtime default change
  - final selected runtime mode alone is enough proof
  - cloud fallback and runtime fallback should be merged into one behavior change
  - this docs child lane should edit source or tests
- Explicit non-goals carried forward:
  - no new runtime modes
  - no default runtime flip
  - no removal of CLI break-glass
  - no Linear mutation behavior changes
  - no broad provider-worker/control-host redesign

## Parity / Alignment Matrix
- Current truth:
  - `resolveRuntimeSelection` permits appserver-to-cli fallback unless the boolean-style fallback guard disables it.
  - `RuntimeFallbackMetadata` exposes `occurred`, `code`, `reason`, `from_mode`, `to_mode`, and `checked_at`.
  - `runtime_mode_requested`, `runtime_mode`, and `runtime_provider` are already persisted to manifests.
  - local route summaries mention runtime fallback when it occurs.
- Reference truth:
  - governed runtime decisions should expose policy, source target, destination target, and reason consistently across manifest/status/proof/control-host surfaces.
  - strict operator intent should fail fast before a different runtime target starts.
  - automatic fallback should remain available but explicit.
- Target truth:
  - `auto` means fallback routing is allowed and auditable.
  - `strict` means fallback routing is denied and the run fails before launching the fallback target.
  - every fallback decision has selected policy, original target, fallback target, and blocking reason.
  - provider-worker and control-host/read-model projections agree with the manifest.
- Explicitly out-of-scope differences:
  - execution-mode cloud fallback policy except where runtime target fallback fields must stay unambiguous
  - unrelated run lifecycle, provider queue, issue handoff, or status UI changes
  - full validation from this child lane

## Readiness Gate
- Not done if:
  - runtime routing can change target without an explicit selected policy
  - `strict` permits fallback launch
  - `auto` hides the blocking reason
  - provider-worker/control-host evidence omits policy truth
  - focused tests miss either policy branch
- Pre-implementation issue-quality review evidence:
  - 2026-04-26: packet reviewed against the parent handoff and current runtime files; the source payload path referenced by the parent is absent from this child workspace, so no additional local issue text was available.
  - 2026-04-26: micro-task path is not appropriate because correctness depends on exact protected wording and cross-surface runtime fallback parity.
- Safeguard ownership split:
  - child lane owns only docs packet and task registration files
  - parent lane owns implementation, focused tests, review, validation, Linear state, workpad, and PR handoff

## Technical Requirements
- Functional requirements:
  1. Introduce a normalized runtime fallback policy with exactly two selected policies: `auto` and `strict`.
  2. Preserve compatibility aliases for existing boolean-style controls where practical, with false/deny/disabled/never/strict resolving to `strict` and default/true/auto resolving to `auto`.
  3. Ensure runtime fallback decisions record selected policy, original target, fallback target, and blocking reason.
  4. Under `auto`, continue to reroute from blocked appserver runtime to CLI fallback when the existing preflight failure conditions apply.
  5. Under `strict`, fail before launching the fallback target and surface an actionable blocking reason.
  6. Propagate the selected policy and fallback fields through manifest mutation, route state, local summaries/status, provider-worker proof hydration, and control-host/read-model surfaces.
  7. Keep cloud execution fallback separate from runtime fallback, while avoiding ambiguous runtime target fields when cloud mode coerces or reroutes runtime selection.
- Non-functional requirements:
  - deterministic policy parsing
  - stable manifest/backward compatibility for existing `runtime_fallback` consumers
  - no silent fallback paths
  - no broad runtime redesign
  - concise operator-facing failures for strict policy blocks
- Interfaces / contracts:
  - `auto`: selected policy that allows runtime fallback routing and records the fallback target plus blocking reason.
  - `strict`: selected policy that denies runtime fallback routing and records the original target plus blocking reason before failing.
  - `original target`: the runtime target requested before fallback routing is applied.
  - `fallback target`: the runtime target selected only when `auto` allows fallback; otherwise the target that would have been used but was blocked by `strict`.
  - `blocking reason`: the preflight or compatibility reason that prevented the original target from being used.

## Likely Implementation Surfaces
- `orchestrator/src/cli/runtime/types.ts`
  - Add a first-class policy type and extend fallback metadata or a nested policy object.
- `orchestrator/src/cli/runtime/provider.ts`
  - Normalize policy input, replace boolean-only fallback checks, and make `auto`/`strict` behavior explicit.
- `orchestrator/src/cli/services/orchestratorExecutionRouteState.ts`
  - Pass normalized policy decisions through route state and effective environment overrides.
- `orchestrator/src/cli/services/orchestratorRuntimeManifestMutation.ts`
  - Persist policy fields alongside existing `runtime_fallback` data without breaking existing manifest consumers.
- `orchestrator/src/cli/services/orchestratorLocalRouteShell.ts`
  - Include selected policy and blocking reason in local route fallback summaries.
- `orchestrator/src/cli/services/orchestratorCloudRouteFallbackContract.ts`
  - Keep execution-mode fallback separate, but validate runtime target fields stay truthful after cloud reroute/coercion.
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - Carry runtime fallback policy truth into provider-worker proof and refreshed proof snapshots where runtime fields are projected.
- `orchestrator/src/cli/controlHostCliShell.ts` and control-host/read-model helpers
  - Expose the same selected policy, original target, fallback target, and blocking reason when presenting or polling provider-worker state.
- `bin/codex-orchestrator.ts`
  - Keep CLI output truthful for runtime fallback summaries and JSON payload fields.

## Architecture & Data
- Architecture / design adjustments:
  - Prefer a shared policy normalization helper close to runtime selection, then consume normalized output in router/provider/control-host layers.
  - Keep legacy `occurred`, `code`, `reason`, `from_mode`, `to_mode`, and `checked_at` fields stable for existing readers.
  - Add explicit fields only where they remove ambiguity that current fields cannot express, especially selected policy and strict blocked fallback target.
- Data model changes / migrations:
  - No persistent database migrations expected.
  - Manifest schema/read-model/proof shape changes may need optional fields so old manifests remain readable.
- External dependencies / integrations:
  - No new external dependencies expected.
  - Linear state remains parent-owned and is not mutated by runtime fallback policy itself.

## Validation Plan
- Tests / checks:
  - focused unit tests for policy parsing and compatibility aliases in the runtime provider
  - focused runtime selection tests for `auto` success fallback and `strict` fail-fast behavior
  - manifest mutation/status tests asserting selected policy, original target, fallback target, and blocking reason
  - local route tests asserting fallback summary contents
  - provider-worker/control-host tests asserting projected policy truth
  - focused CLI output tests if JSON/text payloads change
- Rollout verification:
  - parent runs docs-review before implementation
  - parent runs focused tests before the validation floor
  - parent records standalone review and elegance review before PR handoff
- Monitoring / alerts:
  - runtime fallback summaries and control-host status should make `auto` and `strict` decisions visible enough for operator triage

## Open Questions
- Should `CODEX_ORCHESTRATOR_RUNTIME_FALLBACK` remain the only env surface, or should parent add a clearer `CODEX_ORCHESTRATOR_RUNTIME_FALLBACK_POLICY=auto|strict` while keeping the old env as an alias?
- Should strict blocked fallback details reuse `runtime_fallback.occurred=false`, or use a distinct blocked object/field to avoid implying no fallback decision was considered?

## Approvals
- Reviewer: parent CO-381 lane, pending
- Date: 2026-04-26
