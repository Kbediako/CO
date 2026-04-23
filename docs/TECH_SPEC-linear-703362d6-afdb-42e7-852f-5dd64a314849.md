---
id: 20260424-linear-703362d6-afdb-42e7-852f-5dd64a314849
title: CO Release After v0.1.38
relates_to: docs/PRD-linear-703362d6-afdb-42e7-852f-5dd64a314849.md
risk: high
owners:
  - Codex
last_review: 2026-04-24
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: prepare and ship the first CO release after `v0.1.38` using current `origin/main` truth.
- Scope: docs-first packet, semver decision, release notes, version bump, validation floor, review / PR handoff, merge, signed tag, GitHub release, npm publish, and shared-root closeout evidence.
- Constraints: no release publication from this branch/workspace; current public posture already targets Codex CLI `0.123.0`; release remains blocked until required validation and review gates are green.

## Issue-Shaping Contract
- User-request translation carried forward: CO-316 is the release ship lane for all unreleased main-branch work since `2026-03-03`, not another posture audit and not a narrow patch-only release.
- Protected terms / exact artifact and surface names: `v0.1.38`, `origin/main`, `package.json`, `.agent/SOPs/release.md`, `.github/workflows/release.yml`, `docs/skills-release.md`, `codex-orchestrator skills install --force`, signed annotated tag, GitHub release, npm publish, `0.123.0`.
- Nearby wrong interpretations to reject: patch-style framing, feature-branch tagging, skipping `pack:smoke`, skipping downstream skill guidance, or widening into unrelated cleanup.
- Explicit non-goals carried forward: no new feature work outside release prep, no new Codex adoption lane, no bypass of review/merge workflow.

## Parity / Alignment Matrix
- Current truth: the lane started with package version `0.1.38`, but the release-prep branch now stages `0.2.0`; release-facing workflow pins and policy already target Codex `0.123.0`; `v0.1.38..origin/main` is a large unreleased delta.
- Reference truth: release SOP requires clean-tree validation, signed tag verification, tag-driven release workflow, and package smoke coverage.
- Target truth / intended delta: version and notes reflect the actual released delta, PR merges cleanly, and publish completes from clean `main`.
- Explicitly out-of-scope differences: unrelated docs-freshness maintenance, new posture promotion beyond `0.123.0`, or broad runtime redesign.

## Readiness Gate
- Not done if: semver is unjustified, release notes are incomplete, validation is red, review evidence is missing, release is cut from non-`main`, or publish fails.
- Pre-implementation issue-quality review evidence: parent provider worker reviewed current main and confirmed this lane is broader than a version-string bump because it must reconcile a large post-`v0.1.38` shipped delta, current `0.123.0` posture truth, and the full release execution path.
- Safeguard ownership split: child lane may produce advisory release-delta evidence only; parent owns tracked docs, version bump, validation, Linear/workpad state, PR lifecycle, merge, tag, publish, and closeout.

## Technical Requirements
- Functional requirements:
  1. Capture a release-delta summary for `v0.1.38..origin/main` and justify the next semver.
  2. Update `package.json` and any user-facing release metadata needed for the release.
  3. Prepare truthful release notes covering operator/control-plane, provider/control-host, runtime, review/validation, and Codex posture/distribution themes.
  4. Include downstream install / bundled-skill refresh guidance when the shipped delta warrants it.
  5. Run the ordered validation floor from `.agent/SOPs/release.md`, including `npm run pack:smoke`.
  6. Complete standalone review and elegance pass before review handoff.
  7. After merge, create and verify a signed annotated tag whose version matches `package.json`.
  8. Watch `.github/workflows/release.yml` until GitHub release and npm publish reach terminal success.
- Non-functional requirements (performance, reliability, security):
  - release must fail closed on unsigned tags, version mismatch, or red validation
  - release notes and workpad must be auditable from local artifacts and workflow outputs
  - publish must preserve current npm trusted-publishing fallback posture
- Interfaces / contracts:
  - `.agent/SOPs/release.md`
  - `.github/workflows/release.yml`
  - `docs/skills-release.md`
  - `docs/guides/codex-version-policy.md`
  - `scripts/pack-smoke.mjs`
  - GitHub releases / npm registry

## Architecture & Data
- Architecture / design adjustments:
  - branch-phase: prepare version bump, release notes, and validation on `linear/co-316-release-prep`
  - release-phase: after merge, use clean shared-root `main` for tag and publish
- Data model changes / migrations: release-doc and task-packet registration only; no runtime schema changes are implied by this packet.
- External dependencies / integrations: GitHub, npm, local git signing config, current release workflow secrets and trusted-publishing posture.

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `NOTES="Goal: release CO after v0.1.38 | Summary: version bump, release notes, validation, publish | Risks: release-note drift, publish failure, non-main release source" FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollout verification:
  - verify signed tag locally
  - verify GitHub release created for the tag
  - verify npm package publishes at the chosen version / dist-tag
  - record shared-root before/after status in the final workpad closeout
- Monitoring / alerts:
  - PR checks and `pr ready-review`
  - release workflow run
  - npm publish terminal result

## Open Questions
- Should release notes override the generated Overview section via the annotated tag body?
- Is any follow-up issue required for release-process debt discovered during the floor, or can this lane stay bounded to direct blockers only?

## Current Decisions
- 2026-04-24: selected release semver is `0.2.0`, justified by the `v0.1.38..origin/main` scale (`124` merged PRs / `1238` non-merge commits / `4912` files changed) and the operator/provider/runtime/distribution expansion summarized in `out/linear-703362d6-afdb-42e7-852f-5dd64a314849/manual/20260424T000000Z-release-candidate-summary.md`.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-24
