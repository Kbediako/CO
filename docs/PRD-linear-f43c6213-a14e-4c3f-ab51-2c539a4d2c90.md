# PRD - CO-545 May 16 strict spec-guard stale last_review baseline

## Traceability
- Linear issue: `CO-545` / `f43c6213-a14e-4c3f-ab51-2c539a4d2c90`
- Linear URL: https://linear.app/asabeko/issue/CO-545/co-clear-may-16-strict-spec-guard-stale-last-review-baseline
- Task id: `linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90`
- Canonical spec: `tasks/specs/linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- Task checklist: `tasks/tasks-linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- .agent mirror: `.agent/task/linear-f43c6213-a14e-4c3f-ab51-2c539a4d2c90.md`
- Source issue context: live `node dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-545 --format json` from shared root before worktree creation.

## Summary
- Problem Statement: PR #818 / CO-544 is blocked by a strict `spec-guard` stale `last_review` cohort dated 2026-04-14 and 2026-04-15. The blocker is not CO-544 provider-intake logic, not CO-522 `docs:freshness:maintain`, and not the older CO-523 Apr 8-11 strict spec cohort.
- Desired Outcome: clear the Apr 14/15 stale task-spec cohort without weakening `node scripts/spec-guard.mjs`, deleting historical evidence, or blindly bumping dates.

## User Request Translation
- User intent / needs: review the May 16 Apr 14/15 strict `spec-guard` cohort, decide row by row whether each spec is active or terminal, and make the gate pass with evidence-backed metadata.
- Success criteria / acceptance: the CO-545 packet exists, all affected Apr 14/15 rows are reclassified or reviewed with evidence, and non-dry `node scripts/spec-guard.mjs` passes on the branch.
- Constraints / non-goals: do not touch CO-544 implementation files or PR #818 code, do not reopen CO-522 or CO-523 as this owner, do not weaken/skip/bypass `spec-guard`, do not delete specs solely to pass the gate, and do not conflate strict `spec-guard` with `docs:freshness:maintain`.

## Intent Checksum
- Exact user wording / phrases to preserve: `node scripts/spec-guard.mjs`, strict `spec-guard`, `last_review=2026-04-14`, `last_review=2026-04-15`, tasks/specs/1182..1213, tasks/specs/1219, `tasks/specs/linear-*`, PR #818, CO-544, CO-522, CO-523, no blind bumps, no deletion, no weakening.
- Protected terms / exact artifact and surface names: `node scripts/spec-guard.mjs`, strict `spec-guard`, `last_review=2026-04-14`, `last_review=2026-04-15`, tasks/specs/1182..1213, tasks/specs/1219, `tasks/specs/linear-*`, PR #818, CO-544, CO-522, CO-523, no blind bumps, no deletion, no weakening.
- Nearby wrong interpretations to reject: this is not CO-544 provider-intake logic, not CO-522 `docs:freshness:maintain`, not the older CO-523 Apr 8-11 strict spec cohort, and not permission to bypass `spec-guard`.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Strict `spec-guard` | Current branch fails only on Apr 14/15 stale `tasks/specs/**` rows. | Active specs must have `last_review` <= 30 days; terminal/inactive specs are skipped by policy. | Apr 14/15 rows are inactive `done` where evidence proves completion; the guard remains unchanged. | No guard relaxation, skip flag, bypass, or docs-freshness owner substitution. |
| Numbered task specs | 1182..1213 and 1219 retained stale `draft` metadata. | Completed task checklists should not remain active spec freshness targets. | Same-file checklist completion reclassifies each row as inactive `done`. | No deletion of numbered packet files or historical checklist evidence. |
| UUID-backed task specs | Eighteen `linear-*` rows retained active or missing status metadata. | Live Linear Done/completed source issues should be terminal packet metadata. | Live issue-context evidence reclassifies each row as inactive `done`. | No fabricated `completed_at`; no widening into unrelated Linear issues. |
| CO-544 / PR #818 | Strict stale baseline blocks Core Lane signal after CO-544 metadata repair. | CO-544 implementation remains separately owned. | CO-545 removes this exact baseline blocker and references PR #818 only as context. | No CO-544 implementation edits or PR #818 mutation from this lane. |

## Not Done If
- `node scripts/spec-guard.mjs` still fails on any Apr 14/15 row from the declared cohort.
- Any date is changed without row-level evidence in this packet/spec notes.
- The fix deletes specs to make the gate pass.
- The fix weakens, skips, or bypasses strict `spec-guard`.
- The lane hides this baseline under CO-522 `docs:freshness:maintain` or CO-523 Apr 8-11 ownership.

## Goals
- Create the CO-545 owner packet and mirrors.
- Reclassify verified completed stale task specs to inactive `done` with evidence.
- Keep all historical packet/spec files available.
- Prove non-dry `node scripts/spec-guard.mjs` passes on the branch.

## Non-Goals
- No CO-544 provider-intake or control-host implementation changes.
- No PR #818 mutation except contextual references in notes.
- No `docs:freshness:maintain` owner rehome.
- No broad docs catalog or freshness cleanup outside the exact affected cohort.
- No invented completion timestamps.

## Metrics & Guardrails
- Primary Success Metrics: 51 affected Apr 14/15 rows resolved; `node scripts/spec-guard.mjs` passes; docs/check validation remains green.
- Guardrails / Error Budgets: zero guard-code changes, zero deleted specs, zero CO-544 implementation files changed, and one recorded `linear parallelization` decision.

## Technical Considerations
- Architectural Notes: this is metadata/lifecycle repair for completed packet specs. `scripts/spec-guard.mjs` already skips inactive task spec statuses and terminal task-spec rows, so the correct change is truthful classification.
- Dependencies / Integrations: live Linear `issue-context`, task checklists, `tasks/index.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`, stale baseline handling is the task subject.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Strict `spec-guard` Apr 14/15 stale baseline | Tolerating active stale spec rows or clearing them by blind bump/deletion. | remove fallback | CO-545 | PR #818 / CO-544 Core Lane is blocked by the Apr 14/15 strict spec cohort. | 2026-04-14 | 2026-05-16 | 30 days for stale docs/spec control surfaces. | Exact rows are reviewed and terminal rows are inactive `done` with evidence; `spec-guard` remains strict. | `node scripts/spec-guard.mjs`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `git diff --check`. |

## Open Questions
- None for the current cohort. New stale rows after this branch should be treated as separate baseline evidence, not silently absorbed into CO-545.

## Approvals
- Pre-implementation issue-quality review: 2026-05-16 worker review confirmed the issue is not narrower than the user request and rejects CO-544, CO-522, and CO-523 scope confusion.
- Engineering: pending final validation and standalone review.
