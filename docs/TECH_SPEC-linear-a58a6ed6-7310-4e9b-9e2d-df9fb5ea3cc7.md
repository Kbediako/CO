---
id: 20260501-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7
title: CO-451 Agent Identity Auth Provenance
status: in_progress
owner: Codex
created: 2026-05-01
last_review: 2026-05-01
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md
related_action_plan: docs/ACTION_PLAN-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md
related_tasks:
  - tasks/tasks-linear-a58a6ed6-7310-4e9b-9e2d-df9fb5ea3cc7.md
review_notes:
  - 2026-05-01: Issue-quality review approves CO-451 as a bounded auth-provenance classification lane, not a Codex CLI adoption, binary-provenance, or broad auth redesign lane.
  - 2026-05-01: Source anchor ctx:sha256:1d12d17d552faf262c39610bc990b49e2ef3876d873fd0a767bb239d258e9ce0#chunk:c000001 is metadata-only, so the packet preserves the live Linear issue description and first-turn task prompt as the issue-shaping contract.
---

# Technical Specification

## Summary
- Objective: recognize Agent Identity auth provenance in cloud preflight and provider-worker runtime/reporting paths.
- Scope: `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, focused tests, and docs/task registry mirrors.
- Constraints: preserve secret redaction, retain unknown fallback behavior, and avoid CO-449/CO-450 posture expansion.

## Issue-Shaping Contract
- User-request translation carried forward: CO-451 should classify `CODEX_AGENT_IDENTITY` and Agent Identity auth-event labels as known provenance, so provider-worker proof and cloud preflight diagnostics no longer report Agent Identity runs as unknown.
- Protected terms / exact artifact and surface names: Agent Identity, `codex login --with-agent-identity`, `CODEX_AGENT_IDENTITY`, cloud preflight credential-source detection, provider-worker/runtime auth provenance, redaction/reporting paths, `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/CloudPreflight.test.ts`, CO-449, CO-450.
- Nearby wrong interpretations to reject: raw Agent Identity value logging, auth flow implementation, CLI posture promotion, binary-provenance work, and broad auth normalization refactors.
- Explicit non-goals carried forward: no Codex CLI version adoption, no workflow pin changes, no cloud-canary changes, no CO-449 or CO-450 scope changes, and no raw identity persistence.

## Parity / Alignment Matrix
- Current truth: `CODEX_AGENT_IDENTITY` and Agent Identity labels are absent from current allowlists, so they fall into unknown/redacted paths.
- Reference truth: Codex CLI `0.128.0` exposes Agent Identity login and the `CODEX_AGENT_IDENTITY` env hint.
- Target truth / intended delta: CO recognizes Agent Identity as a safe known credential source in preflight, runtime env provenance, and auth-event parsing.
- Explicitly out-of-scope differences: release posture, binary provenance, runtime-mode defaults, token refresh, and non-auth diagnostics.

## Readiness Gate
- Not done if:
  - preflight env provenance does not return `env:CODEX_AGENT_IDENTITY`
  - runtime env provenance does not return `env:CODEX_AGENT_IDENTITY`
  - auth-event parsing does not normalize safe Agent Identity labels
  - unsafe values or raw identities leak into proof/diagnostics
  - existing `codex_login`, `device_auth`, unknown, and redaction behavior regresses
- Pre-implementation issue-quality review evidence: issue scope is specific to Agent Identity provenance classification and focused tests; implementation can proceed after docs-review evidence is captured.
- Safeguard ownership split: parent owns implementation and cloud preflight tests; bounded child lane owns provider-runner test-file proposal only until accepted.

## Technical Requirements
- Functional requirements:
  1. Include `CODEX_AGENT_IDENTITY` in cloud preflight credential-source env detection.
  2. Include `CODEX_AGENT_IDENTITY` in provider-worker runtime env credential-source detection.
  3. Add one safe canonical provider-worker credential-source label for Agent Identity event payloads.
  4. Preserve safe normalization for env labels and redaction for unsafe labels.
  5. Add focused tests that fail on current `origin/main` and pass after implementation.
- Non-functional requirements: deterministic, small diff, no secret leakage, no runtime network dependency for tests.
- Interfaces / contracts: cloud preflight `authProvenance`, provider-worker `auth_provenance`, JSONL auth-event parser, proof JSON serialization, and existing fingerprint helpers.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth provenance normalization | `credential_source_unknown` / `redacted` for unrecognized or unsafe credential-source values | justify retaining fallback | CO provider-worker/runtime maintainers | missing, future, or unsafe credential source labels | pre-existing before 2026-05-01 | 2026-05-01 | non-expiring supported safety behavior | only replaced by a reviewed central registry with equivalent fail-closed redaction | focused Agent Identity tests plus existing unknown/redaction coverage |

- Large-refactor check: a central credential-source registry would be cleaner if more sources are added, but CO-451 is a narrow parity fix across established local allowlists. A larger refactor is deferred unless review finds additional duplicated auth-source drift.

## Architecture & Data
- Architecture / design adjustments: add the Agent Identity env key to the existing env-key arrays/sets and add the safe normalized event label to the existing provider-worker label set.
- Data model changes / migrations: none.
- External dependencies / integrations: none beyond Codex CLI auth provenance vocabulary.

## Validation Plan
- Tests / checks:
  - targeted `CloudPreflight.test.ts` auth provenance test
  - targeted `ProviderLinearWorkerRunner.test.ts` auth provenance tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review` under `FORCE_CODEX_REVIEW=1`
- Rollout verification: workpad and PR summarize the known Agent Identity provenance behavior and confirm no docs/help update was needed unless a user-visible surface changed.
- Monitoring / alerts: provider-worker proof JSON should show known credential source rather than unknown for Agent Identity-backed runs.

## Open Questions
- None blocking.

## Approvals
- Reviewer: provider worker self-review before implementation, then standalone review before handoff.
- Date: 2026-05-01
