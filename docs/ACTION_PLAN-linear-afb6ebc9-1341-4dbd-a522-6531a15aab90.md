# ACTION_PLAN - CO workflow: add provider adoption eval for source-0, child lanes, and follow-up traceability

## Summary
- Goal: define and later implement a deterministic provider adoption eval that proves `memory/source-0/prompt-pack` usage, parallel-first same-issue child-lane decision/lifecycle proof, and autonomous follow-up/link/workpad traceability.
- Scope: docs-first packet, task registry mirrors, future sanitized eval fixtures, focused adoption assertions, parent-owned docs-review, parent-owned implementation, and parent-owned PR lifecycle.
- Assumptions:
  - The parent lane has access to the authoritative source payload and Linear/workpad state.
  - This child lane does not edit implementation/eval code and does not call Linear mutation helpers.
  - Future eval fixtures must be sanitized and must not require live Linear APIs.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `provider adoption eval`, `memory/source-0/prompt-pack usage`, `ctx:sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d#chunk:c000001`, `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel`, `linear child-lane --action launch|accept|reject|invalidate`, `launch/acceptance proof`, `autonomous follow-up`, `link traceability`, `workpad`, and `sanitized fixture`.
- Not done if: source/prompt-pack proof, child-lane decision/lifecycle proof, or follow-up/link/workpad traceability can be absent while the eval passes; live Linear mutation or unsanitized payloads are used; parent acceptance authority is weakened.
- Pre-implementation issue-quality review: approved from the CO-176 handoff. The docs packet preserves the full requested eval shape and rejects nearby wrong interpretations.

## Milestones & Sequencing
1. Register the docs-first packet and mirrors for canonical task id `20260414-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90`.
2. Parent verifies the source payload path and runs docs-review before implementation.
3. Implement sanitized fixture data for source-0, prompt-pack, child-lane lifecycle, workpad/link, and follow-up records.
4. Implement focused eval assertions that fail closed when source proof, child-lane proof, or traceability proof is missing.
5. Run focused eval tests, docs/registry checks, implementation review, explicit privacy review, and parent-owned PR/handoff gates.

## Execution Update
- Completed: parent accepted the docs-first child-lane patch and verified the source payload hash `f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d`.
- Completed: audited docs-review child stream `co176-docs-review-r2` succeeded before implementation; parent addressed its P2 hygiene findings by removing the generated child-lane checkout and preserving displaced `1029` evidence in `docs/TASKS-archive-2026.md`.
- Completed: `scripts/provider-linear-adoption-eval.mjs` and `npm run eval:provider-adoption` now emit the machine-readable adoption report.
- Completed: golden fixtures cover memory adoption, justified serial review-only behavior, `parallelize_now` with accepted child-lane proof, and guarded follow-up creation.
- Completed: full validation floor passed; manifest-backed standalone review launched under `FORCE_CODEX_REVIEW=1` but stopped at a bounded command-intent violation, so parent completed manual correctness review and explicit elegance pass in `out/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90/manual/20260414T052332Z-review-elegance/00-review-elegance.md`.
- Pending: PR attachment and ready-review drain before review handoff.

## Dependencies
- Parent-owned source payload at `.runs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90-docs-first-packet/cli/2026-04-14T04-42-03-853Z-4d1ae1a8/memory/source-0/source.txt`.
- Future implementation-selected eval harness and fixtures.
- Existing provider-worker, child-lane, workpad/link, and docs-review workflows.

## Validation
- Checks / tests:
  - Child lane: JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`, plus scoped diff/file ownership review.
  - Parent implementation: `npm run eval:provider-adoption` and `npx vitest run --config vitest.config.ts evaluation/tests/provider-linear-adoption.test.ts` passed for source/prompt-pack, child-lane lifecycle, and workpad/link/follow-up traceability.
  - Parent gates: docs-review, implementation-gate, privacy/sanitization review, and normal PR readiness workflow.
- Rollback plan:
  - Revert the CO-176 docs packet and future eval implementation together if the eval contract is wrong; do not alter unrelated provider-worker or child-lane runtime behavior.

## Risks & Mitigations
- Source payload leakage: use sanitized fixtures only and keep raw source payload out of checked-in docs/tests.
- Metric-only adoption proof: require decision, launch, ownership, and parent outcome artifacts.
- Parent mutation bypass: assert workpad/link/follow-up records as fixture data and keep live Linear mutations parent-owned.
- Over-broad implementation: keep future changes in eval/adoption-proof surfaces unless a missing provider behavior is explicitly proven.

## Approvals
- Reviewer: pending docs-review / parent review
- Date: pending
