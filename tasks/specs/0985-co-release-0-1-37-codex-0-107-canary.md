---
id: 20260227-0985-co-release-0-1-37-codex-0-107-canary
title: CO 0.1.37 Release + Codex 0.107 Canary
relates_to: docs/PRD-co-release-0-1-37-codex-0-107-canary.md
risk: high
owners:
  - Codex
last_review: 2026-02-27
---

## Summary
- Objective: Ship CO patch release 0.1.37 and complete an evidence-backed Codex 0.107 prerelease canary decision.
- Scope: Release lifecycle, dummy-repo automation matrix, docs/checklist evidence updates, and final version-policy recommendation.
- Constraints: Docs-first workflow, non-destructive git operations, minimal-change discipline, and strict evidence capture.

## Technical Requirements
- Functional requirements:
  - Bump package version to `0.1.37`.
  - Open/merge release PR with monitored checks and feedback closure.
  - Create signed annotated tag `v0.1.37`, push tag, and verify release workflow + npm publish.
  - Run dummy-repo canary automation for Codex stable `0.106.0` and prerelease `0.107.x`.
  - Record go/no-go recommendation for global Codex version policy.
- Non-functional requirements (performance, reliability, security):
  - No unstable default flips without parity evidence.
  - Canary results must be reproducible via captured logs/scripts.
  - Preserve auth/secrets safety and avoid destructive workflow.
- Interfaces / contracts:
  - `codex-orchestrator pr resolve-merge` for watch/merge automation.
  - Existing runtime fallback/error contract under appserver/cli provider selection.

## Architecture & Data
- Architecture / design adjustments:
  - No runtime architecture change expected for release lane.
  - Canary lane uses existing runner scripts and dummy repo harnesses.
- Data model changes / migrations:
  - Package version metadata only (`package.json`, `package-lock.json`).
- External dependencies / integrations:
  - GitHub API/Actions.
  - npm registry.
  - Codex CLI npm distribution.

## Validation Plan
- Tests / checks:
  - Run ordered guardrail lane when implementation files change.
  - For docs-only phases, run `npm run docs:check` and `npm run docs:freshness`.
  - For release/canary implementation, run full lane: 1..10 including `npm run pack:smoke`.
- Rollout verification:
  - Confirm npm published version is visible.
  - Confirm downstream smoke install/command execution.
  - Confirm canary matrix logs and summary decision artifact.
- Monitoring / alerts:
  - Use PR watch loops and release workflow watches until terminal state.

## Open Questions
- None. Required cloud-lane parity reruns completed.

## Approvals
- Reviewer: Codex (self-approval, docs-first gate).
- Date: 2026-02-27.

## Outcome Snapshot (2026-02-27)
- Release outcome: succeeded (`@kbediako/codex-orchestrator@0.1.37` published).
- Canary outcome: stable/prerelease parity across required cloud + fallback + fail-fast lanes.
- Version-policy outcome: GO for global `0.107.0-alpha.4` default update; retain `0.106.0` as rollback pin.
