# ACTION_PLAN - CO-506 require full fallback metadata for legacy bounded-success review guidance

## Summary
- Goal: create and register the CO-506 traceability packet before the helper-created follow-up leaves `Backlog`; later implementation must require retained-fallback metadata for the legacy bounded-success review guidance path.
- Scope:
  - packet files and mirrors only in this lane
  - later provider-worker guidance/tests
  - later `docs/standalone-review-guide.md` and review guide/help tests because the shipped legacy guidance is currently present there
- Assumptions:
  - Source issue is `CO-478` / PR `#782`.
  - The unsafe seam is the `legacy succeeded payload` guidance with preserved `termination_boundary` but no full retained-fallback metadata requirement.
  - This helper lane must not edit provider-worker implementation, transition Linear, or touch GitHub PRs.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - the packet does not state the `Backlog` hold reason
  - the packet does not state that packet/registry setup clears `backlog_head_follow_up_traceability_pending`
  - later implementation can accept a legacy succeeded payload without full retained-fallback metadata
  - later implementation is docs-only
  - CO-478 semantic `review_verdict` handling is weakened
- Pre-implementation issue-quality review:
  - 2026-05-06: CO-506 is a valid packet-first follow-up from CO-478 / PR #782 and must stay limited to the legacy bounded-success metadata seam.
- Fallback / refactor decision:
  - The task touches legacy/fallback/seam behavior.
  - Decision: expire the fallback where a `legacy succeeded payload` with preserved `termination_boundary` can be accepted without full retained-fallback metadata.
- Durable retention evidence:
  - Modern `review_outcome: bounded-success` plus preserved `termination_boundary` remains successful bounded wrapper completion, but clean handoff still requires `review_verdict: clean`.
- Large-refactor check:
  - A narrow guidance/test implementation is acceptable if it fails closed on missing retained metadata. If implementation needs schema or semantic verdict changes, split or promote the larger review-wrapper refactor.

## Milestones & Sequencing
1. Register traceability packet.
   - Add PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
   - Acceptance: repo-side evidence exists to clear `backlog_head_follow_up_traceability_pending`.
2. Validate packet.
   - Run `git diff --check`, JSON parses, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness` where feasible.
3. Later implementation lane.
   - Update provider-worker guidance to require owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence for legacy succeeded payload acceptance.
   - Add focused first-turn and continuation prompt tests.
   - Update `docs/standalone-review-guide.md` and corresponding guide/help tests for the current shipped legacy wording.
   - Preserve `review_verdict` and bounded-review semantics.

## Dependencies
- CO-478 / PR #782 semantic review verdict implementation.
- Provider-worker review outcome guidance in `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- Provider-worker prompt regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- Current standalone-review guide/help wording in `docs/standalone-review-guide.md`.

## Validation
- Checks / tests:
  - `git diff --check`
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Rollback plan:
  - Revert only the CO-506 packet files and mirror entries if the packet is rejected.
  - Do not revert unrelated packet or implementation work.

## Risks & Mitigations
- Risk: legacy bounded-success wording becomes a permanent compatibility loophole.
  - Mitigation: expire the fallback and require full retained-fallback metadata by 2026-06-05.
- Risk: later implementation weakens `review_verdict`.
  - Mitigation: require tests that keep `review_verdict: clean` as the clean-handoff gate.
- Risk: packet is treated as implementation completion.
  - Mitigation: checklist states provider-worker guidance/tests remain pending in the later implementation lane.

## Approvals
- Reviewer: codex-orchestrator docs-review
- Date: 2026-05-06
- Evidence: `.runs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5/cli/2026-05-06T19-30-14-566Z-97a6084f/manifest.json` (`gpt-5.5`, `xhigh`, `review_outcome=clean-success`, `review_verdict=clean`, `finding_count=0`)
