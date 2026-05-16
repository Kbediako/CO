# ACTION PLAN - CO-545 May 16 strict spec-guard stale last_review baseline

## Summary
- Goal: clear the Apr 14/15 strict `spec-guard` stale `last_review` baseline without weakening the guard, deleting specs, or blindly bumping dates.
- Scope: CO-545 packet/mirrors, affected stale `tasks/specs/**` rows, `tasks/index.json`, `docs/TASKS.md`, and needed docs-freshness registry rows.
- Assumptions: source issue-context and current `origin/main` are authoritative; CO-544 implementation and PR #818 are context only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `node scripts/spec-guard.mjs`, strict `spec-guard`, `last_review=2026-04-14`, `last_review=2026-04-15`, tasks/specs/1182..1213, tasks/specs/1219, `tasks/specs/linear-*`, PR #818, CO-544, CO-522, CO-523, no blind bumps, no deletion, no weakening.
- Not done if: `node scripts/spec-guard.mjs` still fails on the cohort; any row is date-bumped without evidence; any spec is deleted solely to pass the gate; `spec-guard` is weakened; or CO-522/CO-523 scope is used as a substitute owner.
- Pre-implementation issue-quality review: 2026-05-16 worker review confirms this issue is a strict stale-baseline repair lane and rejects CO-544, CO-522, and CO-523 widening.
- Fallback / refactor decision: applies because this is stale baseline handling. Decision is `remove fallback`: do not tolerate active stale rows and do not clear them by blind bump/deletion; reclassify completed rows inactive `done` with evidence.
- Durable retention evidence: historical specs and checklists stay in repo; no deletion or archive-only stub is used.
- Large-refactor check: no code refactor. Existing `spec-guard` inactive/terminal semantics are sufficient; metadata drift is the issue.

## Milestones & Sequencing
1. Verify shared root clean current main and create isolated worktree.
2. Read live CO-545 issue-context and create one workpad with decomposition matrix.
3. Record exactly one `linear parallelization` decision.
4. Reproduce pre-repair strict `spec-guard` failure.
5. Review numbered task checklists and live Linear state for UUID-backed rows.
6. Create CO-545 packet and mirrors.
7. Reclassify affected completed specs inactive `done` with row notes and registry/task-index traceability.
8. Run validation: `node scripts/spec-guard.mjs`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `git diff --check`.
9. Run gpt-5.5/xhigh standalone review and explicit elegance pass.
10. Commit, push, open draft PR, attach it to CO-545, refresh workpad.

## Dependencies
- Live Linear issue-context for CO-545 and the 18 UUID-backed completed source issues.
- Same-file task checklists for 1182..1213 and 1219.
- `scripts/spec-guard.mjs` current strict behavior.
- Parent-owned CO-544/PR #818 monitoring remains outside this branch.

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `git diff --check`
  - gpt-5.5/xhigh standalone review
  - explicit elegance/minimality pass
- Rollback plan: revert the CO-545 packet and metadata reclassification commit; no guard code or CO-544 implementation files are touched.

## Risks & Mitigations
- Risk: row changes look like blind date bumps. Mitigation: each affected spec gets a CO-545 review note and this packet lists row-level evidence.
- Risk: scope bleeds into CO-544 or docs-freshness owner repair. Mitigation: packet and workpad keep protected non-goals explicit.
- Risk: docs-freshness reports unrelated debt after registry touch. Mitigation: run it and classify any unrelated debt instead of widening this lane.

## Approvals
- Reviewer: pending gpt-5.5/xhigh standalone review.
- Date: 2026-05-16
