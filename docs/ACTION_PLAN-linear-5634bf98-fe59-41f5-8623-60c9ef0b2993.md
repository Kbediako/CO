# ACTION PLAN - CO-579 replace terminal CO-575 docs freshness maintenance owner

## Summary
- Goal: clear the terminal global docs freshness owner recurrence and the task-packet/spec freshness drift that validation exposed after the owner re-home.
- Scope: docs-first packet, registry mirrors, `docs/docs-catalog.json` owner binding, `docs/guides/docs-freshness-cohorts.md` current-owner prose, task-index-backed freshness resolution, guarded historical numeric task-key aliases, one CO-300 finding registry reclassification, two CO-545 historical path prose repairs, and linked follow-up CO-580 for the larger lifecycle/finalizer refactor.
- Assumptions:
  - CO-579 is live and same-project.
  - CO-575 is terminal Done/completed and should remain lineage only.
  - CO-568 and CO-569 should remain exact-key baseline cohort owners.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `canonical_owner_key=docs:freshness:maintain`, `owner_issue=CO-575`, terminal owner, `configured_owner_terminal`, rolling cohort entries, `docs/docs-catalog.json`, `CO-568`, `CO-569`.
- Not done if: terminal CO-575 remains configured; CO-568/CO-569 ownership is hidden; historical docs are deleted; freshness/spec checks are weakened; provider/runtime/review-wrapper behavior is changed.
- Pre-implementation issue-quality review: 2026-05-24 approved. Evidence comes from CO-527 packet validation plus live CO-579, CO-575, CO-568, and CO-569 issue-context.
- Fallback / refactor decision: remove the terminal CO-575 owner fallback and retain only expiring, guarded task-index freshness seams until CO-580 lands the shared lifecycle resolver/finalizer.
- Durable retention evidence: not applicable.
- Large-refactor check: the full lifecycle/finalizer refactor is warranted but split to CO-580; CO-579 keeps the bounded owner/freshness repair and records the evidence without landing an over-broad frontmatter-only classifier.
- Minor-seam decision: the task-index freshness seam is acceptable only with active-status gating, unique-alias gating, report-level override audit output, focused regressions, and CO-580 expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` global owner binding | Terminal `CO-575` remains configured as live global owner. | remove fallback | CO-579 | `docs:freshness:maintain --check` reports `configured_owner_terminal`. | 2026-05-23 | 2026-05-24 | Not retained | `docs/docs-catalog.json` points to non-terminal CO-579 and maintain check verifies live owner. | docs freshness maintain, docs check, spec guard. |
| Task-index review-date override | Newer `tasks/index.json` `last_review` can override older registry review dates for indexed task-packet paths. | expire fallback | CO-579 / CO-580 | Task-index review date is newer than registry date for the same task-packet path. | 2026-05-24 | 2026-06-07 | 2026-06-23 | CO-580 lands a centralized lifecycle resolver/finalizer or task-packet mirrors are explicit/archive-clean so registry freshness no longer needs inferred task-index authority. | P1 regressions for statusless entries and numeric alias collisions, task-index override audit output, docs freshness, docs freshness maintain. |
| Historical numeric task-key aliases | Older task packets can list task/spec/docs paths under numeric task keys while PRD/ACTION mirrors omit the numeric prefix. | expire fallback | CO-579 / CO-580 | Historical PRD/ACTION mirrors are not covered by task-index review authority without numeric aliasing. | 2026-05-24 | 2026-06-07 | 2026-06-23 | Historical mirrors are archive-safe, retained as explicit terminal packets, or task-index rows explicitly enumerate all mirror paths. | P1 numeric alias collision regression plus live docs freshness override audit output. |
| Lifecycle authority split | Terminal source state, spec frontmatter, registry status, task-index status, and linked checklist readiness can disagree. | expire fallback | CO-580 | CO-579 found frontmatter-only terminal detection over-blocked active-reviewed packets. | 2026-05-24 | 2026-06-07 | 2026-06-23 | CO-580 lands a shared lifecycle resolver/finalizer or an equivalent smaller proven contract. | CO-580 linked Backlog issue with labels and acceptance criteria. |

## Milestones & Sequencing
1. [x] Create CO-579 in Linear without using the known-risk `create-follow-up` helper.
2. [x] Create PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
3. [x] Register CO-579 in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
4. [x] Re-home `docs/docs-catalog.json` global owner from `CO-575` to `CO-579`.
5. [x] Update `docs/guides/docs-freshness-cohorts.md` current-owner prose to match CO-579 while preserving CO-575 lineage.
6. [x] Convert two CO-545 historical local worktree path references out of backticked path syntax.
7. [x] Add task-index-backed freshness resolution and exact canonical owner reporting for rolling cohorts in both `docs:freshness` and `spec-guard`.
8. [x] Add historical numeric task-key alias support for older PRD/ACTION mirrors.
9. [x] Reclassify the residual CO-300 classification finding registry row as archived.
10. [x] Reclassify the 21 pre-expiry task specs inactive `done` from live Linear `Done/completed` issue-context evidence, with matching task-index rows updated and full packet registry rows retained as `retained_terminal_packet` instead of active date-refreshes or false archive stubs.
11. [x] Prevent implementation-docs archive automation from stubbing evidence-backed `retained_terminal_packet` task candidates or stray candidates by retention age or line threshold, while letting status-only nonterminal stray rows archive when otherwise eligible.
12. [x] Create/link CO-580 for the shared lifecycle resolver and owner-finalizer refactor.
13. [x] Run packet and docs validation.
14. [ ] Transition CO-579 out of In Progress only after packet validation and owner verification.
15. [x] Re-evaluate CO-555 and CO-527 admission after the global owner blocker is no longer first failure.

## Validation
- Checks / tests:
  - `node -e` JSON parse for modified JSON files
	  - `git diff --check`
	  - `node scripts/spec-guard.mjs --dry-run`
	  - `npx vitest run tests/spec-guard.spec.ts`
	  - `npx vitest run tests/docs-freshness.spec.ts`
	  - `npx vitest run tests/docs-freshness.spec.ts tests/docs-freshness-maintain.spec.ts`
	  - `npm run docs:check`
	  - `npm run docs:freshness:maintain -- --check --format json`
	  - `npm run docs:freshness`
	  - `npm run build`
	  - `npm run lint`
	  - `npm run test`
	  - `npm run repo:stewardship`
	  - `node scripts/diff-budget.mjs`
	  - `npm run pack:smoke`
- Rollback plan:
  - revert CO-579 packet and registry rows
  - restore `docs/docs-catalog.json` owner from CO-579 to CO-575 only if the new issue is invalid or not same-project
  - restore CO-545 wording only if docs hygiene no longer treats historical local paths as current paths

## Risks & Mitigations
- Risk: CO-579 hides rolling debt.
  - Mitigation: only owner identity changes; stale cohorts remain in registry and maintain output.
- Risk: CO-568/CO-569 get overwritten.
  - Mitigation: leave baseline cohort owner mappings untouched.
- Risk: CO-545 path repair changes evidence meaning.
  - Mitigation: only remove path syntax; keep historical local worktree wording.
- Risk: task-index freshness hides real stale docs.
  - Mitigation: apply it only to indexed task-packet paths when the task-index review date is newer, and emit source metadata for audit.
- Risk: lifecycle disagreement remains after CO-579.
  - Mitigation: CO-580 is linked as the labelled Backlog owner for the shared resolver/finalizer refactor; CO-579 avoids converting task-spec frontmatter into a hard lifecycle authority by itself.

## Approvals
- Reviewer: parent CO orchestrator issue-quality review.
- Date: 2026-05-24
