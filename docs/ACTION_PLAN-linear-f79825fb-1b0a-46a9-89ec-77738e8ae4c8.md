# ACTION_PLAN - CO-532 hard-stale current book and skill docs

## Summary
- Goal: refresh five current book/skill docs and their metadata without folding them into CO-530 legacy cleanup.
- Scope: current book docs, shipped companion skill docs, freshness registry/catalog metadata, focused guard evidence, and CO-532 packet mirrors.
- Assumptions: CO-522 remains the live maintenance owner until both current-doc and legacy-cohort debt are resolved.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs/book/operations.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/skills.md`, `skills/README.md`, `docs:freshness`, CO-522, CO-530, `blocking_changed_paths=[]`.
- Not done if: any named current doc remains hard-stale or registry dates change without content review.
- Pre-implementation issue-quality review: baseline freshness evidence names the five files; maintenance evidence separates hard-stale current docs from legacy candidate cohorts.
- Fallback / refactor decision: remove the current-doc stale condition and focused evidence gap directly.
- Durable retention evidence: guard coverage and docs freshness reports stay machine-readable.
- Large-refactor check: defer inherited legacy cohort repair to CO-530/CO-522; this lane remains current-doc focused.

## Milestones & Sequencing
1. Create packet, registry mirrors, workpad, and parallelization evidence.
2. Reproduce `docs:freshness` and `docs:freshness:maintain` baseline naming the five files.
3. Review and refresh parent-owned book docs.
4. Accept or reject child-owned skills docs patch.
5. Update freshness registry/catalog metadata after classification.
6. Add focused guard evidence for hard-stale current docs.
7. Run validation, standalone review, elegance pass, PR attach, and ready-review drain.

## Dependencies
- Current `origin/main`.
- Same-issue child lane `skills-current-docs` for skills docs.

## Validation
- Checks / tests: focused test, `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and manifest-backed review.
- Rollback plan: revert docs, registry, and guard changes; rerun freshness to restore baseline evidence.

## Risks & Mitigations
- Risk: date-only refresh hides stale content. Mitigation: record per-file classification and content truth sources.
- Risk: CO-530 scope is accidentally widened. Mitigation: preserve CO-530 wording as legacy Apr 9-12 only and keep current-doc evidence under CO-532.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: no broad freshness-policy refactor is needed; the lane repairs current-doc review debt and focused guard evidence only.
- Minor-seam check: no retained minor seam remains; direct current-doc action routing replaces the stale ambiguous evidence path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current book/skill docs | Active public docs stale beyond 14-day cadence | remove fallback | CO-532 | `docs:freshness` hard-stale current-doc paths | 2026-04-24 | 2026-05-13 | removed in this lane | Five paths no longer hard-stale | `npm run docs:freshness` |
| Maintenance evidence | Hard-stale current docs could be mentally grouped with legacy cohorts | remove fallback | CO-532 | `docs:freshness:maintain` sample paths include current docs | 2026-05-13 | 2026-05-13 | removed in this lane | Guard evidence keeps direct current-doc action explicit | focused docs-freshness maintain test |

## Approvals
- Reviewer: pending.
- Date: 2026-05-13.
