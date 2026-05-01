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
  - 2026-05-01: Current-turn origin/main refresh, validation, manifest-backed standalone review, and elegance review are green; PR handoff remains before In Review.
---

# Technical Specification

## Context
Codex CLI `0.128.0` introduced Agent Identity login support, but CO cloud preflight and provider-worker runtime provenance still use older credential-source allowlists. Agent Identity-backed provider runs would therefore look like unknown credential provenance even when auth is intentionally configured.

## Requirements
1. Recognize `CODEX_AGENT_IDENTITY` in cloud preflight credential-source detection.
2. Recognize `CODEX_AGENT_IDENTITY` in provider-worker runtime env auth provenance.
3. Recognize safe Agent Identity auth-event labels in provider-worker JSONL parsing.
4. Keep unknown and unsafe credential-source labels fail-closed as `credential_source_unknown` or `redacted`.
5. Add focused tests that cover Agent Identity next to existing `codex_login` and `device_auth` cases.
6. Update docs/help surfaces only if the implementation changes user-visible auth-provenance wording.

## Issue-Shaping Contract
Protected terms: `CO-451`, Agent Identity, `codex login --with-agent-identity`, `CODEX_AGENT_IDENTITY`, cloud preflight credential-source detection, provider-worker/runtime auth provenance, redaction/reporting paths, `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/CloudPreflight.test.ts`, CO-449, CO-450.

Wrong interpretations rejected: raw identity logging, token storage, auth flow implementation, Codex CLI posture promotion, binary-provenance work, workflow pin changes, and broad auth-redesign work.

Explicit non-goals carried forward: no release-intake promotion, no workflow/cloud canary change, no CO-449 or CO-450 expansion, and no raw identity persistence.

## Parity / Alignment Matrix
- Current truth: older allowlists recognize token/API-key env sources and legacy safe labels such as `codex_login` and `device_auth`.
- Reference truth: Agent Identity is a Codex CLI auth provenance source exposed by `codex login --with-agent-identity` and `CODEX_AGENT_IDENTITY`.
- Target truth: Agent Identity is classified as known provenance in the same proof surfaces as existing sources.
- Out-of-scope differences: release posture, binary provenance, runtime-mode defaults, token refresh, and unrelated diagnostics.

## Readiness Gate
- Not done if: Agent Identity remains unknown/redacted when represented by the safe env key or safe event label; unsafe values leak; existing auth provenance behavior regresses; docs imply CLI posture adoption.
- Pre-implementation issue-quality review evidence: exact source/test surfaces and non-goals are explicit enough to proceed after docs-review.
- Safeguard ownership split: parent owns implementation and docs packet; child lane owns only `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` until accepted.

## Technical Requirements
- Functional requirements:
  - add `CODEX_AGENT_IDENTITY` to env credential-source allowlists
  - add canonical safe Agent Identity credential-source label normalization for auth events
  - preserve fingerprint/redaction behavior for profile/account values
  - keep fallback behavior for unknown and unsafe values
- Non-functional requirements: deterministic local tests, minimal diff, no network dependency, no secret leakage.
- Interfaces / contracts: cloud preflight result details, provider-worker proof `auth_provenance`, JSONL auth-event parser, runtime env provenance.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth provenance normalization | unknown/redacted credential-source handling | justify retaining fallback | CO provider-worker/runtime maintainers | missing, future, or unsafe credential source labels | pre-existing before 2026-05-01 | 2026-05-01 | non-expiring supported safety behavior | only replaced by an equivalent reviewed central registry | Agent Identity tests plus existing unknown/redaction tests |

## Architecture & Data
- Architecture / design adjustments: update existing allowlists and tests without new abstraction unless review finds additional duplicate drift.
- Data model changes / migrations: none.
- External dependencies / integrations: Codex CLI Agent Identity auth vocabulary only.

## Validation Plan
- Tests / checks: targeted CloudPreflight and ProviderLinearWorkerRunner tests, docs-review, delegation guard, spec guard, build, lint, full tests, docs:check, docs:freshness, repo stewardship, diff budget, standalone review, elegance review, PR checks, ready-review drain.
- Rollout verification: workpad and PR record Agent Identity known provenance and whether docs/help updates were unnecessary.
- Monitoring / alerts: provider-worker proof JSON should no longer show unknown for Agent Identity-backed runs.

## Open Questions
- None blocking.

## Approvals
- Reviewer: provider worker and standalone review.
- Date: 2026-05-01
