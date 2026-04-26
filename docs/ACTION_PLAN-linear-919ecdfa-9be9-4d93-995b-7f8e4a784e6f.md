# ACTION PLAN - CO Codex CLI 0.123 Cloud Gate Rerun and Promotion Decision

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: replace the stale CO-322 missing-environment HOLD with current required/fallback cloud evidence and a truthful `0.123.0` promotion/hold decision.
- Scope: CO-335 workpad, canary reruns, manifest validation, policy/pin updates, CO-316 blocker-story truth, validation, review, and PR handoff.
- Assumptions: CO-322's upstream/npm/help/runtime/marketplace audit remains valid for the same `0.123.0` candidate; CO-335 only fills the cloud-gate gap.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-335`, `CO-322`, `CO-316`, `0.123.0`, `Kbediako/CO`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `docs/guides/codex-version-policy.md`.
- Not done if: old missing environment remains the blocker, no current canary manifests exist, or release-planning surfaces imply latest-stable readiness without evidence.
- Pre-implementation issue-quality review: approved by parent provider worker on 2026-04-23; the issue scope is exactly the missing post-rotation cloud-gate and posture decision.

## Milestones & Sequencing
1. Confirm issue workflow state, workpad, prior PR feedback, branch, build, and current non-secret cloud environment label.
2. Run required cloud canary and fallback cloud contract.
3. Inspect canary manifests/run summaries and classify both gates.
4. Update docs-first packet, version policy, workflow pins/tests, release-planning docs, and CO-316 blocker story.
5. Run validation, review/elegance gates, PR lifecycle, and ready-review drain before In Review.

## Dependencies
- Codex CLI `0.123.0` available locally.
- Codex cloud auth can submit to non-secret env label `Kbediako/CO`.
- Existing CO-322 artifacts for non-cloud candidate audit.

## Validation
- Checks / tests: `npm run build`, both `npm run ci:cloud-canary` variants, direct manifest/run-summary inspection, `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed standalone review, `npm run pack:smoke`, and `pr ready-review`.
- Rollback plan: if a current gate or validation fails, keep or restore HOLD with exact current blocker and do not move pins to `0.123.0`.

## Risks & Mitigations
- Risk: stale CO-322 cloud blocker is carried forward after current env/auth passes. Mitigation: cite CO-335 manifests and task id.
- Risk: fallback pass is mistaken for required cloud proof. Mitigation: keep required and fallback evidence separate in policy/workpad.
- Risk: pin movement widens into release publication. Mitigation: docs say CO-335 promotes planning/posture only; release ship remains CO-316.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-23
