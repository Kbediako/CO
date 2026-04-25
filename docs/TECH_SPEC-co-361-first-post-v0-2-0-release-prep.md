---
id: 20260426-co-361-first-post-v0-2-0-release-prep
title: CO-361 First Post-v0.2.0 Release Prep
relates_to: docs/PRD-co-361-first-post-v0-2-0-release-prep.md
risk: medium
owners:
  - Codex
last_review: 2026-04-26
---

## Summary
- Objective: prepare the smallest truthful release-prep diff for the first post-`v0.2.0` release lane.
- Scope: task mirrors, `package.json`, `package-lock.json`, `README.md`, `docs/guides/codex-version-policy.md`, and the linked live `docs/book/*` posture summaries.
- Constraints: no publish/tag/merge, no cloud promotion, no unrelated cleanup.

## Issue-Shaping Contract
- User-request translation carried forward: prepare a clean release PR that keeps current `gpt-5.5` / `0.125.0` / `appserver` posture visible, keeps portable fallback defaults intact, and avoids a lazy blanket hold on appserver/package posture.
- Protected terms / exact artifact and surface names: `package.json`, `package-lock.json`, `README.md`, `docs/guides/codex-version-policy.md`, `docs/book/public-posture.md`, `docs/book/README.md`, `docs/book/codex-cli-0124-adoption.md`, `@openai/codex@0.125.0`, `gpt-5.5`, `appserver`, `npm run pack:smoke`.
- Nearby wrong interpretations to reject: publish the release, retarget cloud-canary without evidence, or reopen broader posture/default work.
- Explicit non-goals carried forward: cloud execution promotion, provider-runtime promotion, and release publication.

## Parity / Alignment Matrix
- Current truth:
  - version remains `0.2.0`
  - README historical package-docs link is stale
  - version policy and book/public summaries overstate the `0.124.0` hold for local/package release-facing posture
- Reference truth:
  - CO-351 / CO-352 / CO-355 already provide local appserver, model posture, and downstream-smoke/package evidence for current `0.125.0`
- Target truth / intended delta:
  - bump package version for the next release branch
  - route older package-doc readers to `v0.2.0`
  - clarify that current `0.125.0` posture is adopted for local/package surfaces while cloud-only proof remains separately gated
  - keep the linked `0.124.0` evidence page explicitly historical rather than current
- Explicitly out-of-scope differences:
  - no workflow logic change unless the audit proves a release blocker
  - no change to portable `gpt-5.4` fallback defaults

## Readiness Gate
- Not done if:
  - version bump lands without the public/package-surface truth fixes
  - docs claim cloud proof that this lane did not produce
  - release-prep changes require a publish step to validate
- Pre-implementation issue-quality review evidence: current audit shows the real blocker is stale public release posture wording, not missing runtime or release-workflow support on `origin/main`.
- Safeguard ownership split: this worker owns only the clean worktree and the release-prep docs/files created there.

## Technical Requirements
- Functional requirements:
  1. Bump `package.json` and `package-lock.json` to the next release-prep version.
  2. Update `README.md` so the historical package-doc route points at `v0.2.0`.
  3. Update `docs/guides/codex-version-policy.md` and the linked `docs/book/*` posture summaries to distinguish current `0.125.0` local/package posture from the still-separate cloud-only candidate.
- Non-functional requirements (performance, reliability, security):
  - keep the diff reviewable and release-prep-only
  - preserve truthful portable fallback guidance
  - preserve current release workflow and pack-smoke command surfaces unless directly contradicted by the audit
- Interfaces / contracts:
  - `npm run pack:audit`
  - `npm run pack:smoke`
  - `codex --version`
  - `codex debug models`
  - `codex app-server --help`

## Architecture & Data
- Architecture / design adjustments: documentation-only posture clarification plus semver metadata bump.
- Data model changes / migrations: package metadata version changes only.
- External dependencies / integrations: npm registry lookups, installed `codex` CLI help/model surfaces, packaged release docs.

## Validation Plan
- Tests / checks:
  - docs-review child lane (or documented fallback)
  - `npm run build`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run pack:audit`
  - `npm run pack:smoke`
- Rollout verification:
  - confirm current installed `codex` reports `0.125.0`
  - confirm `codex debug models` includes `gpt-5.5`
  - confirm npm latest/install truth for `@openai/codex` and `@kbediako/codex-orchestrator`
- Monitoring / alerts:
  - if `pack:smoke` fails on the current `0.125.0` marketplace contract, stop and report exact failure instead of weakening the smoke.

## Open Questions
- None beyond the final semver number for this release-prep branch.

## Approvals
- Reviewer: parent release worker audit
- Date: 2026-04-26
