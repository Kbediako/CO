# ACTION_PLAN: CO-553 docs freshness policy capacity cleanup

## Summary
- Goal: clear the `docs:freshness:maintain` policy capacity blocker without weakening gates or changing caps.
- Scope: docs-first packet, active-capacity classifier, registry reclassification, status anatomy, focused tests, and required validation.
- Assumptions: `CO-522` stays the current non-terminal owner anchor; historical packet rows can be archived as metadata while keeping files on disk.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `block_policy_over_budget`, `policy_capacity_status`, `current_entries=470`, `max_entries=300`, `current_cohorts=37`, `max_cohorts=2`, `CO-522`, `CO-552`, live remediation issue, canonical owner anchor, no date bump, no gate weakening.
- Not done if: over-budget debt remains unexplained, strict gates are weakened, caps are raised, rows are deleted, or CO-522 is made terminal under the current owner model.
- Pre-implementation issue-quality review: live `linear issue-context` showed Ready, no attached PR, and no workpad; issue moved to In Progress and one workpad was created before coding.
- Fallback / refactor decision: this task removes stale historical rows from live capacity classification and removes the status anatomy opacity seam; no retained fallback is introduced.
- Durable retention evidence: archived packet rows keep history on disk and record archive metadata in the freshness registry.
- Large-refactor check: long-term owner identity split is deferred because CO-553 can clear the concrete policy capacity blocker without widening into owner architecture.
- Minor-seam decision: the bounded seam change is acceptable because it removes hidden/non-actionable freshness debt rather than adding a retained fallback.

## CO-382 Fallback Decision Table
| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` capacity/actionability | Historical capacity and rolling-current actionability seam that let rows look clean or non-actionable under owner/capacity routing | remove fallback | CO-553 | Current direct-action docs and non-candidate rolling rows can hide or block without path/action evidence. | 2026-05-17 | 2026-05-17 | N/A after removal | Live capacity classification surfaces stale current docs and rolling non-candidate current docs as blocking action evidence. | `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts`; parent stale/rolling probe; `node scripts/spec-guard.mjs --dry-run`; `npm run build`. |

## Milestones & Sequencing
1. Reproduce baseline `block_policy_over_budget` and capture counts.
2. Create docs-first packet and register it in task/docs freshness metadata.
3. Apply focused capacity tests from the same-issue child lane.
4. Implement upstream freshness reporting, active-capacity filtering, and status anatomy.
5. Reclassify historical task packet/mirror/report rows, keep non-terminal task packets active, and refresh reviewed active rows only after content review.
6. Run focused and required validation, then review/elegance/PR handoff. If review-wrapper semantic telemetry remains `unknown` despite clean-in-substance output, record the required break-glass waiver and manual correctness/regression/missing-tests review before PR handoff.

## Dependencies
- `CO-522` remains the live `docs:freshness:maintain` owner anchor.
- Existing docs catalog and registry policy semantics remain authoritative.

## Validation
- Checks / tests: `npx vitest run --config vitest.config.core.ts tests/docs-freshness.spec.ts tests/docs-freshness-maintain.spec.ts`, status projection/UI focused test, non-terminal lifecycle regression coverage, `node scripts/docs-freshness-maintain.mjs --check --format json`, `npm run docs:freshness`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, current `co-status` proof, and standalone-review waiver/manual fallback review if semantic telemetry cannot produce `review_verdict=clean`.
- Rollback plan: revert registry reclassification and implementation/test changes; strict gates return to the pre-change blocker state.

## Risks & Mitigations
- Risk: classifying active debt as historical. Mitigation: only archive rows with terminal or preserved historical lifecycle evidence, keep non-terminal task packets active, refresh reviewed active rows directly, and preserve tests for active over-budget failures.
- Risk: status output becomes noisy. Mitigation: add compact count/excess fields while keeping existing fields intact.

## Approvals
- Reviewer: CO provider worker
- Date: 2026-05-17
