---
id: 20260423-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f
title: CO Codex CLI 0.123 Cloud Gate Rerun and Promotion Decision
relates_to: docs/PRD-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: independently rerun and classify the Codex CLI `0.123.0` required/fallback cloud gates after cloud env/auth rotation, then update release-planning posture.
- Scope: canary commands, manifest/run-summary validation, version policy, release-planning pins, CO-316 blocker-story wording, and task mirrors.
- Constraints: no secret exposure; no release ship; no widening into release-skill parity, release notes parity, or marketplace redesign.

## Issue-Shaping Contract
- User-request translation carried forward: CO-335 owns the post-rotation cloud gate rerun that CO-322 left blocked, and must make the promotion/hold decision from current evidence.
- Protected terms / exact artifact and surface names: `CO-335`, `CO-322`, `CO-316`, Codex CLI `0.123.0`, `Kbediako/CO`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `.github/workflows/cloud-canary.yml`, `tests/pack-smoke.spec.ts`, `docs/guides/codex-version-policy.md`.
- Nearby wrong interpretations to reject: stale-env HOLD, fallback-only promotion, release ship work, or broad marketplace rebaseline.
- Explicit non-goals carried forward: release publication, release-skill/docs-check parity, release-notes parity, provider migration, and unrelated docs baseline cleanup.

## Parity / Alignment Matrix
- Current truth: policy/pins still hold `0.123.0` because CO-322 lacked clean required cloud evidence.
- Reference truth: CO-322 already records official upstream/npm, command-surface, marketplace, and runtime-mode evidence with no P0/P1 signal; version policy requires required cloud and fallback gates before promotion.
- Target truth / intended delta: CO-335 adds fresh required and fallback cloud evidence, then promotes `0.123.0` if both pass.
- Explicitly out-of-scope differences: actual release lane and non-cloud-gate rebaseline work.

## Readiness Gate
- Not done if: no fresh current cloud/auth evidence; old environment `6999395fcc448191b865917084f21c6f` remains the blocker despite current env/auth; manifests are not independently inspected.
- Pre-implementation issue-quality review evidence: parent provider worker confirmed CO-335 is not narrower than the user request because acceptance requires env/auth stamp, both canary contracts, independent validation, policy/pin updates, and CO-316 blocker story truth.
- Safeguard ownership split: parent worker owns canary commands, policy edits, Linear workpad, validation, review, and PR handoff; no safe child-lane slice existed before canary classification.

## Technical Requirements
- Functional requirements:
  - Run `CODEX_CLOUD_ENV_ID=Kbediako/CO CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary` for the required cloud contract.
  - Run `CODEX_CLOUD_ENV_ID=Kbediako/CO CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary` for the fallback contract.
  - Inspect `manifest.json` and `run-summary.json` for cloud execution/fallback fields.
  - Update policy and release-planning pins to a single promote/hold decision.
- Non-functional requirements (performance, reliability, security): no secrets in committed docs or Linear workpad; all evidence paths are task-scoped; validation gates must be reproducible.
- Interfaces / contracts: `scripts/cloud-canary-ci.mjs`, Codex cloud CLI, Linear workpad, GitHub Actions workflow pins, pack-smoke workflow assertions.

## Architecture & Data
- Architecture / design adjustments: no runtime architecture change; this is a policy/pin and evidence update.
- Data model changes / migrations: `tasks/index.json` and docs freshness registry gain CO-335 task metadata.
- External dependencies / integrations: Codex cloud auth/env, GitHub Actions workflows, Linear.

## Validation Plan
- Tests / checks:
  - `npm run build`
  - required and fallback `npm run ci:cloud-canary` variants
  - manifest/run-summary field inspection
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `npm run review`
  - `npm run pack:smoke`
- Rollout verification: PR attached to CO-335 and `pr ready-review` drain clean before In Review handoff.
- Monitoring / alerts: GitHub checks and Linear workpad evidence.

## Open Questions
- None.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-23
