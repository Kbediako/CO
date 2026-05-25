# ACTION_PLAN - CO-585 review docs freshness public and spec pre-expiry batch

## Added by Bootstrap 2026-05-25

## Summary
- Goal: Clear the exact 2026-06-01 public-doc and active-spec pre-expiry batch with real review evidence.
- Scope: CO-585 docs-first packet, two public docs, ten active specs, task/freshness registries, and validation evidence.
- Assumptions: CO-584 registry integrity repair is present; any remaining terminal lifecycle or rolling cohort blockers are separately owned residue.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `block_spec_guard_pre_expiry`, `docs:freshness:spec-and-public-pre-expiry:2026-06-01`, `codex-orchestrator:canonical-owner-key=docs:freshness:spec-and-public-pre-expiry:2026-06-01`, the two public paths, and the ten active spec paths.
- Not done if: Review dates are bumped without evidence, gates are weakened, historical docs are deleted, or unrelated owner residue is hidden under CO-585.
- Pre-implementation issue-quality review: Baseline reproduction matched the CO-584 handoff evidence: `registry_blockers=0`, `invalid_entries=0`, `missing_in_registry=0`, `missing_on_disk=0`, `pre_expiry_entries=2`, and `spec_guard_pre_expiry_entries=10`.
- Fallback / refactor decision: This task touches break-glass wording in provider onboarding. Retain the documented CLI break-glass path as explicit operational safety while app-server provider authority remains the normal route; re-review by 2026-06-24.
- Durable retention evidence: Provider onboarding says direct `start provider-linear-worker` is unsupported, root control-host recover/relaunch/nudge is the normal route, and `codex exec`/resume are break-glass only.
- Large-refactor check: No broader refactor is warranted for a docs/spec review batch.

## Milestones & Sequencing
1. Reproduce the post-CO-584 `block_spec_guard_pre_expiry` baseline and record same-turn parallelization.
2. Launch and accept bounded public-guide child lane while parent reviews the ten active specs.
3. Update public docs/spec review evidence and registry/task metadata.
4. Run required validation, standalone review, elegance pass, PR feedback drain, and Linear handoff only after the workpad is current.

## Dependencies
- CO-584 registry integrity repair must be present in the branch baseline.
- Same-issue child lane `public-guides-review` supplies bounded public-doc review evidence.

## Validation
- Checks / tests: JSON parse, `git diff --check`, `node scripts/spec-guard.mjs --dry-run`, `node scripts/delegation-guard.mjs`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `docs:freshness:maintain --check --format json`, manifest-backed standalone review, and explicit elegance review.
- Rollback plan: Revert the CO-585 branch. Do not weaken docs freshness or spec guard to recover.

## Risks & Mitigations
- Risk: Remaining docs freshness output may still be nonzero for unrelated owner debt. Mitigation: classify by emitted `freshness_decision` and canonical owner, and do not claim CO-585 owns it.
- Risk: Public-doc runtime wording could drift into unsupported launch guidance. Mitigation: keep normal route on root control-host recover/relaunch/nudge and label CLI resume as break-glass.
- Risk: Spec review notes become generic date bumps. Mitigation: each note names current implementation/test anchors.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-25.
