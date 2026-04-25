---
id: 20260423-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46
title: CO: scope provider-linear parallelization proof invariants to the current turn
relates_to: docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md
risk: medium
owners:
  - Codex
last_review: 2026-04-23
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- PRD: `docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- Action plan: `docs/ACTION_PLAN-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- Checklist: `tasks/tasks-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`

## Scope
- Parent implementation should repair the provider-linear proof invariant that emits `parallelization_decision_multiple`.
- The invariant must evaluate the `current-turn same-issue parallelization decision`, not every historical decision in `provider-linear-worker-linear-audit.jsonl`.
- The repair must keep proof, manifest, `runs.json`, and operator diagnostic surfaces aligned with the terminal lane outcome.
- This child lane owns docs only; parent owns code, tests, registry mirrors, review, PR lifecycle, Linear, and workpad updates.

## Issue-Shaping Contract
- User-request translation carried forward: successful multi-turn provider-linear runs must not fail closeout merely because earlier turns also recorded valid same-issue parallelization decisions.
- Protected terms / exact artifact and surface names: `provider-linear-worker-proof`, `parallelization_decision_multiple`, `owner_status=failed`, `manifest.status`, `runs.json`, `provider-linear-worker-linear-audit.jsonl`, `current-turn same-issue parallelization decision`.
- Nearby wrong interpretations to reject: weakening the parallelization contract, ignoring true same-turn duplicates, hiding real worker failures, deleting audit rows, or changing unrelated closeout semantics.
- Explicit non-goals carried forward: no Linear mutation, no registry mirror mutation in this child lane, no source/test changes in this child lane, no masking of stale control-host or genuine worker failures.

## Current / Reference / Target Truth
- Current / reported truth:
  - A successful run can accumulate multiple valid `linear parallelization` audit rows over multiple turns.
  - The proof invariant can treat those valid per-turn rows as one same-turn duplicate set.
  - The run can end with `owner_status=failed`, `end_reason=parallelization_decision_multiple`, failed `manifest.status`, and failed summary surfaces even after review handoff and merge closeout succeeded.
- Reference truth:
  - Each active turn requires exactly one explicit same-issue parallelization decision.
  - A duplicate is only a duplicate when more than one valid decision belongs to the same current turn.
  - Earlier turns remain historical audit evidence and should not count against the active turn.
- Target truth / intended delta:
  - Proof failure resolution selects current-turn decisions by a same-issue audit cursor captured immediately after the current turn bootstrap proof is hydrated; entries before that cursor remain historical.
  - `parallelization_decision_multiple` is emitted only for true same-turn duplicate decisions.
  - Multi-turn success leaves `provider-linear-worker-proof`, `manifest.status`, `runs.json`, and operator diagnostics in the same successful state.
  - Audit retention remains cumulative in `provider-linear-worker-linear-audit.jsonl`.
- Explicitly out-of-scope differences:
  - child-lane admission policy
  - parent-owned patch acceptance policy
  - Linear workflow-state transition semantics
  - control-host stale-claim reconciliation
  - broader run summary redesign

## Likely Implementation Surfaces
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - proof writing and final failure resolution for provider-linear worker turns
  - current-turn fields such as `current_turn_started_at`
  - parallelization failure reasons including `parallelization_decision_multiple`
- `provider-linear-worker-proof`
  - final proof state, selected parallelization summary, owner status, and end reason
- `provider-linear-worker-linear-audit.jsonl`
  - cumulative audit input that must remain historical
- Summary and projection surfaces that consume proof/manifest state:
  - `manifest.status`
  - `out/.../runs.json`
  - provider issue observability / operator diagnostics

## Technical Requirements
- Functional requirements:
  - Identify the current turn before checking parallelization invariants.
  - Filter `provider-linear-worker-linear-audit.jsonl` parallelization rows to the same issue and the current turn.
  - Treat exactly one current-turn decision as valid when child-lane launch expectations also pass.
  - Treat zero current-turn decisions as the existing missing-decision failure.
  - Treat more than one current-turn decision as `parallelization_decision_multiple`.
  - Do not let earlier-turn decisions trigger `parallelization_decision_multiple`.
  - Keep cumulative audit rows readable in proof and audit artifacts.
- Non-functional requirements:
  - deterministic local artifact behavior with no new network calls
  - fail-closed behavior when turn boundaries are missing or ambiguous
  - no audit truncation or post-hoc mutation
  - scoped implementation in provider worker proof/failure resolution
- Interfaces / contracts:
  - proof finalization must report `owner_status` and `end_reason` from current-turn invariant results
  - `manifest.status` must not be set to `failed` by prior-turn valid decisions
  - summary surfaces must preserve enough evidence to explain which current-turn decision was evaluated

## Validation Plan
- Docs child lane:
  - protected-term check across the six owned packet files
  - trailing-whitespace scan across the six owned packet files
- Parent implementation lane:
  - focused regression where a multi-turn successful run records one valid decision per turn and does not end with `parallelization_decision_multiple`.
  - focused regression where two decisions in the same current turn still fails with `parallelization_decision_multiple`.
  - focused regression where no current-turn decision still fails closed.
  - focused regression proving previous-turn and previous-attempt decisions do not hydrate into a new current turn.
  - focused assertion that `provider-linear-worker-proof`, `manifest.status`, and `runs.json` align for the successful multi-turn case.
  - likely scoped command: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/ProviderIssueObservability.test.ts`.
  - parent-selected spec guard, docs-review, implementation gate, and PR validation.

## Acceptance Criteria
1. The proof invariant checks only the current turn's same-issue parallelization decision set.
2. One decision in each of multiple turns is valid and does not produce `parallelization_decision_multiple`.
3. More than one decision in the same current turn still fails closed with `parallelization_decision_multiple`.
4. Missing current-turn decisions still fail closed with explicit evidence.
5. `provider-linear-worker-linear-audit.jsonl` remains cumulative and auditable.
6. Successful lane closeout no longer yields failed `owner_status`, failed `manifest.status`, or failed `runs.json` solely due to earlier-turn valid decisions.

## Open Questions
- Resolved 2026-04-23: use a refreshed post-bootstrap same-issue audit cursor as the authoritative selector for current-turn decisions. Use `current_turn_started_at` with `attempt_started_at` fallback only for current-turn child-lane launch classification, not for the duplicate-decision cursor.
- Resolved 2026-04-23: the fixed failure path is `resolveProviderLinearWorkerParallelizationFailure(...)`; proof `owner_status` / `end_reason` feed manifest and run summary surfaces, so validation should assert the proof state and rerun summary-facing gates after current-main merge.

## Approvals
- Docs-first packet: same-issue docs child lane `.runs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46-docs-packet/cli/2026-04-23T03-59-42-098Z-c11737dd/manifest.json`
- Parent docs-review / implementation review: pending parent lane
- Date: 2026-04-23
