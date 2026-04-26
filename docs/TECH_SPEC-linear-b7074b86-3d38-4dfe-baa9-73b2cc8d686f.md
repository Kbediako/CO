---
id: 20260426-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f
title: CO-390 Upstream Codex CLI Release Detection And Release Intake
relates_to: docs/PRD-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md
risk: high
owners:
  - Codex
last_review: 2026-04-26
---

## Summary
- Objective: register CO-390 as the docs-first release-detection and canonical release-intake triggering lane for upstream Codex CLI.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Constraints: preserve exact release-intake wording, avoid implementation or workflow edits, do not mutate Linear from this child lane, and leave the parent lane to own final issue integration.

## Issue-Shaping Contract
- User-request translation carried forward: CO-390 should detect when upstream Codex CLI release evidence has moved beyond CO's current governed posture and should trigger canonical release intake, not adoption. The detector must compare GitHub release truth, npm `@openai/codex` dist-tags/time, the CO version-policy target, and workflow pins before creating or updating one canonical Linear intake issue from the CO-386 release-intake template.
- Protected terms / exact artifact and surface names: upstream Codex CLI release detection, canonical release-intake triggering, GitHub release truth, npm `@openai/codex` dist-tags/time, CO version-policy target, workflow pins, one canonical Linear intake issue, CO-386 release-intake template, `docs/guides/codex-version-policy.md`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, `tests/pack-smoke.spec.ts`, `@openai/codex`, `dist-tags`, `time`, `latest`, `rust-v*`, `CO-390`, `CO-386`.
- Nearby wrong interpretations to reject: npm `latest` alone is enough, a GitHub tag alone is enough, local `codex --version` is enough, release detection should update workflow pins, release detection should promote the CO version-policy target, or each signal should open its own Linear issue.
- Explicit non-goals carried forward: no implementation, package, workflow, or test edits in this child lane; no Linear mutation; no version promotion; no workflow pin update; no cloud-canary or pack-smoke rebaseline; no duplicate release-intake issue creation.

## Parity / Alignment Matrix
- Current truth: CO records version posture in `docs/guides/codex-version-policy.md`, with workflow pins intentionally split by evidence and compatibility. Release candidates are currently audited in task-scoped posture lanes after human/operator discovery.
- Reference truth: upstream release readiness must be corroborated by GitHub release truth and npm `@openai/codex` dist-tags/time. Intake must use the CO-386 release-intake template and must deduplicate to one canonical Linear intake issue.
- Target truth / intended delta: parent implementation has a deterministic release-detection classifier that returns no-op, update existing canonical intake, or create one canonical Linear intake issue. It records GitHub release truth, npm registry time/dist-tag evidence, CO version-policy target comparison, and workflow pin comparison without claiming promotion readiness.
- Explicitly out-of-scope differences: direct posture changes, workflow pin changes, cloud canary execution, package publishing, marketplace smoke redesign, and child-lane Linear mutation.

## Readiness Gate
- Not done if:
  - GitHub release truth and npm `@openai/codex` dist-tags/time are not both required.
  - CO version-policy target and workflow pins are not compared.
  - the path can create duplicate Linear intake issues for the same upstream release.
  - the CO-386 release-intake template is not used for new intake.
  - release detection is framed as adoption, promotion, or pin alignment.
  - this child lane edits implementation, package, workflow, or test files.
  - this child lane mutates Linear state.
- Pre-implementation issue-quality review evidence: approved for docs-only packet drafting. The issue is not narrow enough for the micro-task path because correctness depends on exact release-truth surfaces, exact protected terms, and a canonical issue-shaping contract.
- Safeguard ownership split: child lane owns only the declared docs/task registry files. Parent owns source reconciliation, Linear issue search/create/update, implementation, docs-review, validation, workpad state, PR lifecycle, and patch integration.

## Technical Requirements
- Functional requirements:
  1. Preserve the protected wording for upstream Codex CLI release detection and canonical release-intake triggering.
  2. Require GitHub release truth and npm `@openai/codex` dist-tags/time as independent corroborating inputs.
  3. Compare release evidence against the CO version-policy target in `docs/guides/codex-version-policy.md`.
  4. Compare release evidence against workflow pins in `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, and `tests/pack-smoke.spec.ts`.
  5. Deduplicate against existing release-intake work before creating anything new.
  6. Create at most one canonical Linear intake issue per upstream release candidate, using the CO-386 release-intake template.
  7. Preserve adoption/promotion gates as downstream posture-lane requirements, not release-detection requirements.
- Non-functional requirements (performance, reliability, security): release detection must be deterministic, auditable, idempotent, and fail closed on conflicting GitHub/npm evidence. It must not weaken the existing version-policy gates or create operator noise with duplicate issues.
- Interfaces / contracts: GitHub releases/tags for upstream Codex CLI, npm registry metadata for `@openai/codex`, CO version-policy docs, workflow pin files, Linear issue search/create/update handled by parent, and CO-386 template content.

## Architecture & Data
- Architecture / design adjustments: none in this child lane. Parent implementation should keep the classifier boundary narrow: collect release facts, normalize comparison state, deduplicate canonical intake, then emit a no-op/update/create decision with evidence.
- Data model changes / migrations: none in this docs packet. Parent may add a canonical-owner marker or release-candidate key only if it is needed for deduplication and stays within implementation scope.
- External dependencies / integrations: GitHub release API or equivalent release feed, npm registry metadata, Linear integration owned by parent, and current repo workflow/policy files.

## Validation Plan
- Child-lane checks:
  - protected-term scan across the six packet/mirror files
  - JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `git diff --check --` scoped to the declared files
  - `git diff --name-only --` scoped review to ensure no files outside the declared scope changed
- Parent-lane checks:
  - docs-review before implementation
  - focused tests for release evidence normalization and deduplication if implementation adds code
  - no full-suite requirement from this child lane
  - workflow/pin validation only if parent implementation touches those surfaces
- Rollout verification: parent records the canonical release-intake trigger decision, source evidence, dedupe result, and Linear issue linkage in task mirrors and workpad.
- Monitoring / alerts: parent-owned release-detection output should make no-op/update/create decisions visible without creating duplicate issue noise.

## Open Questions
- What exact marker or search key should identify the existing canonical Linear intake issue for a release candidate?
- Should prerelease tags, npm `next`/non-`latest` dist-tags, or npm publish-time-only changes trigger a full intake issue or an advisory no-op?
- Does the CO-386 release-intake template already include every required evidence field, or does the parent need to add a narrowly scoped template extension?

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-04-26
