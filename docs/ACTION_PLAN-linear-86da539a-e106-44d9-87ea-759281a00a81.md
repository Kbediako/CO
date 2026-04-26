# ACTION_PLAN - CO-395 review-wrapper fallback expiry

## Summary
- Goal: create the CO-395 docs-first packet and registry mirrors for review-wrapper fallback expiry before parent implementation work.
- Scope: packet files, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows for the new CO-395 surfaces only.
- Assumptions:
  - the parent prompt carries the authoritative issue shape for this child lane
  - the child checkout did not include the original parent source payload under `.runs/`
  - current `origin/main` contains `docs/guides/fallback-expiry-and-refactor-policy.md`, and parent reconciliation treats that policy as authoritative
  - parent owns Linear state, workpad, PR lifecycle, implementation, and full validation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `review wrapper`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
- Protected surfaces:
  - scoped prompt retry
  - synthesized title fallback
  - generated fallback notes
  - bounded-review fallback contracts
  - review telemetry classification
- Not done if:
  - a retry/fallback is allowed to drop explicit scope
  - durable safety fallbacks are removed without replacement validation
  - telemetry classification is weakened or flattened
  - this child lane performs Linear/GitHub lifecycle work
- Pre-implementation issue-quality review:
  - 2026-04-27: parent accepted the scoped docs child lane, rebased onto current `origin/main`, and reconciled the packet against `docs/guides/fallback-expiry-and-refactor-policy.md`.
  - 2026-04-27: micro-task path is not appropriate because correctness depends on exact protected wording, protected surfaces, non-goals, and fallback expiry decision-table parity.

## Milestones & Sequencing
1. Confirm source payload and policy-file availability without querying Linear.
2. Create the CO-395 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
3. Register the new canonical spec and checklist in `tasks/index.json`.
4. Add a current CO-395 snapshot to `docs/TASKS.md`.
5. Add docs freshness registry rows only for the new CO-395 packet/checklist surfaces.
6. Run scoped validation:
   - JSON parse checks for edited registries
   - `node scripts/spec-guard.mjs --dry-run`
   - focused review-wrapper tests for direct-success and retry/fallback coverage
7. Leave changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Reconcile live CO-395 issue text and the fallback-expiry policy before implementation.
2. Run docs-review on the packet.
3. Inspect current `review wrapper` code paths around scoped prompt retry, synthesized title fallback, generated fallback notes, bounded-review fallback contracts, and review telemetry classification.
4. Remove any retry-without-scope fallback that cannot preserve explicit scope.
5. Expire synthesized-title/artifact-only scoped prompt fallback metadata if retained, or record why the fallback is still temporary.
6. Justify retaining generated fallback notes only as a bounded no-empty-context guard.
7. Justify retaining command-intent bounded retry and review telemetry classification as durable safety contracts with tests.
8. Run parent-owned focused and full validation as appropriate, then handle Linear/GitHub lifecycle.

## Dependencies
- Original source anchor `ctx:sha256:2ad735bd7603aa57616c6fa318ee89a796462b103bed9568d6fd16928618bd1e#chunk:c000001`
- Child lane source anchor `ctx:sha256:77c98bad7ca4cfe8e5367dc6eb6e20c1d9eff50fc4338300073a8c74303bb730#chunk:c000001`
- `scripts/run-review.ts`
- `scripts/lib/review-launch-attempt.ts`
- `scripts/lib/review-prompt-context.ts`
- `scripts/lib/review-execution-telemetry.ts`
- `tests/review-launch-attempt.spec.ts`
- `tests/review-prompt-context.spec.ts`
- `tests/review-execution-telemetry.spec.ts`
- `tests/run-review.spec.ts`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(...)"` for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts tests/review-prompt-context.spec.ts tests/review-execution-telemetry.spec.ts tests/run-review.spec.ts`
  - scoped `git diff --name-only` / `git status --short`
- Rollback plan:
  - revert only the CO-395 packet and registry mirror edits if parent source reconciliation changes the issue shape before implementation

## Risks & Mitigations
- Risk: source payload or policy text later adds narrower requirements.
  - Mitigation: parent reconciliation anchored this packet to the current CO-382 policy before implementation.
- Risk: fallback expiry is misread as permission for a large refactor.
  - Mitigation: the packet frames CO-395 as a minor seam decision and rejects broad standalone-review redesign.
- Risk: removing compatibility code weakens bounded review.
  - Mitigation: remove only scope-dropping fallback; justify retaining durable command-intent and telemetry safety contracts with focused tests.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-27
- Parent implementation: stale scope-dropping retry removed; synthesized scoped-title fallback retained with CO-395 expiry metadata; generated notes, command-intent retry, and telemetry classification justified as durable contracts.
- Parent review: manifest-backed review returned no actionable regressions; latest repo-relative telemetry artifact `.runs/linear-86da539a-e106-44d9-87ea-759281a00a81/cli/2026-04-26T20-07-39-220Z-8ba45809/review/telemetry.json` records `review_outcome=clean-success` after the CodeRabbit feedback fix rerun.
- Parent elegance pass: no simplification edits required before PR handoff.
