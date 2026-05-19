---
id: 20260421-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13
title: "CO: clarify README when main documents behavior newer than the latest tagged package"
status: in_progress
relates_to: docs/PRD-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md
risk: medium
owners:
  - Codex
last_review: 2026-05-18
related_action_plan: docs/ACTION_PLAN-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md
task_checklists:
  - tasks/tasks-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- PRD: `docs/PRD-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- Task checklist: `tasks/tasks-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- Source anchor: `ctx:sha256:7f6dd672017997283582c2d667c65a1b0ed8cab23d07c2795d2e02801d90fa46#chunk:c000001`

## Summary
- Objective: make the root README truthful when `main` documents behavior that is newer than the latest tagged and published package.
- Scope:
  - README release-truthfulness wording
  - release-safe route for published-package users
  - task packet, registry mirrors, and workpad updates required by docs-first
- Constraints:
  - no runtime, package, or release behavior changes
  - no blind claim that new `docs/public/*` guides are release-safe for `v0.1.38`
  - no broad README redesign

## Issue-Shaping Contract
- User-request translation carried forward: `CO-273` is a docs truthfulness lane. The repo currently says more on `main` than the latest published package actually ships, so README must warn readers and steer release-aligned users to a safe path.
- Protected terms / exact artifact and surface names:
  - `README.md`
  - `package.json`
  - `0.1.38`
  - `v0.1.38`
  - `latest tagged package`
  - `release-safe docs`
  - `source-head only`
  - `docs/public/downstream-setup.md`
  - `docs/public/provider-onboarding.md`
  - `plugins/codex-orchestrator`
  - `.agents/plugins/marketplace.json`
- Nearby wrong interpretations to reject:
  - fix the mismatch by cutting a release
  - imply `docs/public/*` already existed in `v0.1.38`
  - treat checkout/Git installs as release-aligned without a pinned tag
  - widen into a full public-doc reorganization
- Explicit non-goals carried forward:
  - no release or publish work
  - no package-content or plugin-implementation changes
  - no unrelated README cleanup

## Parity / Alignment Matrix
- Current truth:
  - `package.json.version` is `0.1.38`
  - `git describe --tags --abbrev=0` resolves to `v0.1.38`
  - `git rev-list --count v0.1.38..HEAD` confirms the current branch remains more than 1200 commits ahead of `v0.1.38`
  - `README.md` on `main` references post-tag surfaces including `docs/public/*` and packaged marketplace/plugin flows
- Reference truth:
  - `v0.1.38` had only the root README as the shipped front-door doc surface
  - `v0.1.38` package contents did not include `docs/public/*`, `.agents/plugins/marketplace.json`, or `plugins/**`
- Target truth / intended delta:
  - README says it tracks `main`
  - README routes published-package users to the tagged `v0.1.38` README
  - source-head-only setup guidance is labeled where the content is newer than `v0.1.38`
- Explicitly out-of-scope differences:
  - package release, publish, or version bump
  - adding versioned doc hosting or automation
  - changing runtime or plugin semantics

## Readiness Gate
- Not done if:
  - README still reads as if current `main` is release-safe for `0.1.38`
  - published-package users have no explicit tagged-doc route
  - source-head-only guidance is still unlabeled
  - the diff changes anything beyond docs truthfulness and required mirrors
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: live issue context showed `Ready`, no comments, no workpad, and no attached PR; the issue was moved to `In Progress` before coding.
  - 2026-04-21: current repo evidence confirms the reported mismatch: `package.json` is still `0.1.38`, latest tag is `v0.1.38`, `main` remains more than 1200 commits ahead, and `docs/public/*` plus packaged marketplace/plugin docs are post-tag additions.
  - 2026-04-21: the micro-task path is not appropriate because the lane depends on exact public wording and release-truthfulness boundaries.
- Safeguard ownership split:
  - parent lane owns Linear state/workpad, docs packet, registry mirrors, README final wording, validation, PR lifecycle, and merge handoff
  - same-issue child lane `readme-release-truth` successfully produced an in-bounds README patch, but accept invalidated on live Linear `updated_at` drift; parent will apply the bounded intent manually instead of relying on an accepted child mutation

## Technical Requirements
- Functional requirements:
  1. README must state that the repo front door tracks current `main`.
  2. README must identify `v0.1.38` as the current tagged/package reference in this checkout.
  3. README must route published-package users to a release-safe doc path, specifically the tagged `v0.1.38` README.
  4. README must mark setup guidance that depends on post-`v0.1.38` behavior as source-head-only.
  5. The lane must update task mirrors and registries required by docs-first.
- Non-functional requirements:
  - docs-only diff
  - no `package.json.version` or tag mutation
  - minimal wording change beyond the boundary clarification
- Interfaces / contracts:
  - `README.md` is the front-door surface
  - `package.json` and git tags provide the local release truth
  - `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json` must stay aligned

## Architecture & Data
- Architecture / design adjustments:
  - no code architecture changes
  - use a small README boundary note plus targeted section labels instead of a full rewrite
- Data model changes / migrations:
  - add the task packet to `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - no runtime data or schema changes
- External dependencies / integrations:
  - Linear helper surface for workpad and state transitions
  - git metadata for local tag / commit-count evidence

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
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollout verification:
  - README contains the main-versus-release warning and tagged-doc route
  - no package/release behavior changed
  - workpad records the child-lane invalidation and parent manual-apply recovery
- Monitoring / alerts:
  - if the latest tag changes later, handle any new truthfulness drift in a separate lane rather than overextending `CO-273`

## Open Questions
- None currently.

## Approvals
- Reviewer: final standalone review `bounded-success` recorded in `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T07-35-34-622Z-391b3ca3/review/telemetry.json`; stale handoff-status and unrelated registry-row P2s addressed, with no actionable diff-local issues remaining before PR handoff
- Date: 2026-04-21
