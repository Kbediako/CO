---
id: 20260426-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f
title: CO-390 Upstream Codex CLI Release Detection And Release Intake
status: in_progress
owner: Codex
created: 2026-04-26
last_review: 2026-04-26
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md
related_action_plan: docs/ACTION_PLAN-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md
related_tasks:
  - tasks/tasks-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md
review_notes:
  - 2026-04-26: Issue-quality review approves CO-390 as a docs-first release-detection and canonical release-intake shaping lane, not a Codex CLI adoption or workflow-pin lane.
  - 2026-04-26: Source payload path supplied by the parent is absent in this child checkout; packet preserves the parent-provided source anchor and protected issue wording instead of calling Linear mutation helpers or inventing body text.
---

# Technical Specification

## Context
CO-390 defines a governed path for upstream Codex CLI release detection. Current local policy evidence keeps version posture in `docs/guides/codex-version-policy.md` and records workflow pins as intentionally governed surfaces. This task should shape the intake trigger that compares upstream evidence to those surfaces and routes any new candidate through one canonical Linear intake issue using the CO-386 release-intake template.

## Requirements
1. Preserve protected wording: upstream Codex CLI release detection, canonical release-intake triggering, GitHub release truth, npm `@openai/codex` dist-tags/time, CO version-policy target, workflow pins, one canonical Linear intake issue, CO-386 release-intake template.
2. Require GitHub release truth and npm `@openai/codex` dist-tags/time as separate inputs.
3. Compare upstream release evidence against `docs/guides/codex-version-policy.md`.
4. Compare upstream release evidence against workflow pins in `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, and `tests/pack-smoke.spec.ts`.
5. Deduplicate before mutating Linear and create at most one canonical Linear intake issue for a release candidate.
6. Use the CO-386 release-intake template for any new intake issue.
7. Keep release detection separate from Codex CLI adoption, workflow pin changes, cloud canary execution, and pack-smoke rebaseline.

## Issue-Shaping Contract
Protected terms: `CO-390`, upstream Codex CLI release detection, canonical release-intake triggering, GitHub release truth, npm `@openai/codex` dist-tags/time, CO version-policy target, workflow pins, one canonical Linear intake issue, CO-386 release-intake template, `docs/guides/codex-version-policy.md`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, `tests/pack-smoke.spec.ts`, `@openai/codex`, `dist-tags`, `time`, `latest`, `rust-v*`.

Wrong interpretations rejected: npm `latest` alone is enough; GitHub tag/release alone is enough; local `codex --version` is enough; detection should promote the CO target; detection should update workflow pins; each release signal should create its own issue; child lane should mutate Linear.

Explicit non-goals carried forward: no implementation, package, workflow, test, or pin edits; no Linear mutation; no version promotion; no cloud-canary or pack-smoke execution; no marketplace rebaseline; no duplicate release-intake issue creation.

## Parity / Alignment Matrix
- Current truth: CO version posture and workflow pins are governed separately, and recent Codex CLI posture work is evidence-gated.
- Reference truth: a canonical upstream release candidate requires corroborated GitHub release truth and npm `@openai/codex` dist-tags/time.
- Target truth: the parent implementation can decide no-op, update existing canonical intake, or create one canonical intake issue from CO-386 with evidence and dedupe.
- Out-of-scope differences: child-lane implementation edits, workflow pin updates, version promotion, and Linear mutation.

## Readiness Gate
- Not done if: protected terms are missing; GitHub/npm evidence is not required; CO version-policy target or workflow pins are not compared; dedupe is optional; CO-386 template is absent; adoption/promotion semantics leak into release detection; or this child lane edits outside docs/task registries.
- Pre-implementation issue-quality review evidence: approved for docs-only packet drafting. Parent must perform docs-review before implementation.
- Safeguard ownership split: child lane owns this packet and mirrors only. Parent owns Linear state, implementation, validation, and PR lifecycle.

## Technical Requirements
- Functional requirements:
  - collect and normalize GitHub release and npm registry evidence
  - compare evidence against current CO policy target and workflow pins
  - identify whether an existing canonical intake issue covers the candidate
  - create or update only one canonical intake issue through parent-owned Linear integration
  - preserve source evidence in the intake issue body/workpad
- Non-functional requirements: deterministic, idempotent, auditable, fail-closed on conflicting evidence, and quiet when no release drift exists.
- Interfaces / contracts: GitHub release surface, npm registry, CO version-policy doc, workflow pin files, CO-386 template, parent-owned Linear integration.

## Architecture & Data
- Architecture / design adjustments: none in this child lane. Parent should keep any implementation boundary narrow around release evidence normalization, policy/pin comparison, and canonical issue dedupe.
- Data model changes / migrations: none in this packet.
- External dependencies / integrations: GitHub, npm registry, Linear, and current repo policy/workflow files.

## Validation Plan
- Child-lane checks:
  - protected-term scan over packet files
  - JSON parse for registry files
  - scoped `git diff --check --`
  - scoped changed-file review
- Parent-lane checks:
  - docs-review before implementation
  - focused tests for release evidence comparison and Linear dedupe if code is touched
  - no full repo validation required by this child lane
- Rollout verification: parent records release candidate evidence, dedupe result, and canonical issue linkage in task mirrors.
- Monitoring / alerts: parent-owned output should show no-op/update/create decisions without duplicate issue noise.

## Open Questions
- Which canonical key should deduplicate a release candidate: release tag, npm version, CO-386 marker, or a dedicated owner marker?
- How should prerelease and non-`latest` dist-tags be classified?
- Does CO-386 need a template extension for workflow pin comparison evidence?

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-04-26
