---
id: 20260507-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5
title: "CO-506 require full fallback metadata for legacy bounded-success review guidance"
relates_to: docs/PRD-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md
risk: high
owners:
  - Codex
last_review: 2026-05-07
related_action_plan: docs/ACTION_PLAN-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md
task_checklists:
  - tasks/tasks-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md
---

# TECH_SPEC Mirror - CO-506 require full fallback metadata for legacy bounded-success review guidance

Canonical spec: `tasks/specs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`.

## Summary
- Objective: require full retained-fallback metadata before provider-worker or review guidance can accept a `legacy succeeded payload` with preserved `termination_boundary` as successful bounded review completion.
- Scope:
  - packet files and registry mirrors
  - later provider-worker review outcome guidance
  - later regression tests for first-turn and continuation prompts
  - later standalone-review guide/help or telemetry guidance tests where the legacy bounded-success wording is shipped
- Constraints:
  - preserve modern `review/telemetry.json` behavior for `status: succeeded`, `review_outcome: bounded-success`, preserved `termination_boundary`, and `review_verdict`
  - preserve CO-478 semantic verdict handling
  - do not change Codex review CLI exit-code behavior
  - do not weaken command-intent or bounded-review guards
  - keep `CO-474` product recovery out of scope

## Issue-Shaping Contract
- User-request translation carried forward: create the packet before CO-506 leaves `Backlog`; later implementation must require retained-fallback metadata for the legacy succeeded review path and must include shipped guidance/tests.
- Protected terms / exact artifact and surface names:
  - `review/telemetry.json`
  - `status: succeeded`
  - `review_outcome: bounded-success`
  - `legacy succeeded payload`
  - `preserved termination_boundary`
  - `review_verdict`
  - `retained-fallback metadata`
  - `owner`
  - `trigger`
  - `introduced date`
  - `review date`
  - `maximum lifetime or expiry`
  - `removal condition`
  - `reason`
  - `validation evidence`
- Nearby wrong interpretations to reject:
  - treating preserved `termination_boundary` as enough legacy fallback proof
  - treating `bounded-success` as clean handoff without `review_verdict: clean`
  - changing review CLI exit-code semantics
  - weakening command-intent, bounded-review, `termination_boundary`, or semantic verdict handling
  - making the later fix docs-only
  - broadening into `CO-474`
- Explicit non-goals carried forward:
  - no provider-worker implementation in this packet lane
  - no Linear transition
  - no GitHub PR lifecycle work

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Modern `review/telemetry.json` | Modern payloads include `status`, `review_outcome`, `termination_boundary`, and `review_verdict`. | CO-478 requires semantic verdict checks before clean wording. | Preserve modern telemetry semantics. | Changing wrapper exit code interpretation. |
| Legacy succeeded payload | Legacy payload guidance can lean on preserved `termination_boundary`. | Legacy fallback behavior needs explicit retained metadata. | Require full retained-fallback metadata or fail closed. | Dropping modern bounded-success support. |
| Provider-worker prompts | First-turn and continuation prompts carry review outcome guidance. | Prompt guidance must be specific enough for workers to record truth. | Tests must assert the legacy path names all required metadata fields. | Broad prompt rewrite outside review outcome guidance. |
| Standalone-review guide/help | `docs/standalone-review-guide.md` currently documents older telemetry as `succeeded + non-null termination_boundary` => bounded success. | Legacy compatibility guidance must expose owner, trigger, dates, lifetime, removal, reason, and evidence. | Later implementation must update the shipped guide/help wording and corresponding tests while that legacy text remains present. | Review CLI behavior changes. |
| Backlog hold | Missing packet/mirrors hold helper-created follow-up in `Backlog`. | Packet and mirrors clear `backlog_head_follow_up_traceability_pending`. | This packet supplies the clearance evidence only. | Transitioning Linear here. |

## Readiness Gate
- Not done if:
  - a `legacy succeeded payload` can be accepted without retained-fallback metadata
  - the later implementation lacks tests
  - `review_verdict` is bypassed
  - `termination_boundary` guard semantics are weakened
  - the issue leaves `Backlog` without packet/mirror evidence
- Pre-implementation issue-quality review evidence:
  - 2026-05-07: CO-506 is not narrower than the user request because it preserves all protected terms, the CO-478/PR #782 source, the `Backlog` hold reason, and the later guidance/test requirement.
  - 2026-05-07: micro-task path is unavailable because the task touches legacy/fallback/seam behavior and exact review outcome terms.
- Safeguard ownership split:
  - This packet lane owns only docs-first traceability setup.
  - A later implementation lane owns provider-worker guidance/tests and current review guide/help tests for the shipped legacy wording.
  - CO-478 remains source evidence for semantic review verdict behavior.

## Technical Requirements
- Later implementation must update provider-worker review outcome guidance so `legacy succeeded payload` acceptance requires retained-fallback metadata: owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence.
- Later implementation must preserve the statement that `review_outcome: bounded-success` is successful bounded wrapper completion, not clean handoff by itself.
- Later implementation must preserve that clean handoff still requires `review_verdict: clean`.
- Later implementation must add regression tests for first-turn and continuation provider-worker prompts.
- Because `docs/standalone-review-guide.md` currently references the legacy compatibility path, later implementation must update the shipped guide/help text and corresponding tests.
- If implementation needs runtime interpretation beyond guidance, it must fail closed when retained metadata is missing instead of treating legacy telemetry as clean.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker review outcome guidance | `legacy succeeded payload` with preserved `termination_boundary` can be treated as successful bounded review completion without full retained-fallback metadata. | expire fallback | CO-506 / `review-wrapper:bounded-success-legacy-fallback-metadata` | A legacy review telemetry payload has `status: succeeded` and preserved `termination_boundary` but lacks modern `review_outcome` / `review_verdict` fields. | 2026-05-06 | 2026-05-07 | 2026-06-05 | Remove legacy succeeded payload support, or require owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence before accepting the legacy path. | `ProviderLinearWorkerRunner` prompt regressions, `docs/standalone-review-guide.md` guide/help tests for the current legacy wording, telemetry fixture tests if runtime interpretation changes, docs checks, standalone review. |

- Large-refactor check: another minor seam is acceptable only if the implementation is limited to guidance/tests and fail-closed legacy metadata checks. If the work must change review telemetry schema, wrapper outcome disposition, or semantic verdict parsing, prefer a larger review-wrapper consolidation or split a separate follow-up.

## Architecture & Data
- Architecture / design adjustments:
  - Expected later source surface: `orchestrator/src/cli/providerLinearWorkerRunner.ts` review outcome guidance.
  - Expected later test surface: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` first-turn and continuation prompt assertions.
  - Required later documentation/test surface while current legacy guide wording exists: `docs/standalone-review-guide.md`, `scripts/run-review.ts`, and `tests/run-review.spec.ts`.
- Data model changes / migrations:
  - None required for the packet lane.
  - Later implementation should not add telemetry fields unless guidance-only enforcement is insufficient.
- External dependencies / integrations:
  - Existing review telemetry artifacts under `.runs/**/review/telemetry.json`.
  - Provider-worker prompts and workpad review handoff guidance.

## Validation Plan
- Packet validation:
  - `git diff --check`
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Later implementation validation:
  - focused `ProviderLinearWorkerRunner` prompt tests
  - `tests/run-review.spec.ts` or standalone-review guide/help tests for the current `docs/standalone-review-guide.md` legacy wording
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - broader build/lint/test/review gates scaled to source changes

## Approvals
- Reviewer: codex-orchestrator docs-review
- Date: 2026-05-07
- Evidence: `.runs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5/cli/2026-05-06T19-30-14-566Z-97a6084f/manifest.json` (`gpt-5.5`, `xhigh`, `review_outcome=clean-success`, `review_verdict=clean`, `finding_count=0`)
