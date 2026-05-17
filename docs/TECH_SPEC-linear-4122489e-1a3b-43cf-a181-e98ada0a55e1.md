---
id: 20260416-linear-4122489e-1a3b-43cf-a181-e98ada0a55e1
title: CO Codex CLI 0.121.0 Adoption Posture Audit
relates_to: docs/PRD-linear-4122489e-1a3b-43cf-a181-e98ada0a55e1.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

## Summary
- Objective: re-audit CO against stable Codex CLI `0.121.0` and decide whether to promote the active `0.118.0` compatibility/adoption target.
- Scope: official release/npm evidence, local command-surface audit, runtime/cloud canaries, auth-profile rotation boundary, promote/hold decision, and active docs/task mirror updates.
- Constraints: no marketplace packaging, no MCP Apps metadata adoption, no provider-worker appserver migration, no `gpt-5.4-codex` validation, and no spark policy refactor.

## Issue-Shaping Contract
- User-request translation carried forward: CO-195 is an evidence-gated adoption posture audit for `0.121.0`; the cloud canary is required, and multi-auth operator workflows must be accounted for explicitly.
- Protected terms / exact artifact and surface names: Codex CLI `0.121.0`, Codex CLI `0.118.0`, `rust-v0.121.0`, `@openai/codex`, `codex exec`, `codex exec resume`, `codex review --help`, `codex login --device-auth`, `codex marketplace add --help`, app-server/MCP help, runtime-mode canary, cloud canary, fallback canary, `CODEX_CLOUD_ENV_ID`.
- Nearby wrong interpretations to reject: local version-only promotion, silent cloud-gate weakening, packaging marketplace support, provider-worker appserver switch, and burying a reproduced auth-profile bug inside posture notes.
- Explicit non-goals carried forward: plugin marketplace packaging, MCP Apps metadata adoption, provider-worker appserver migration, `gpt-5.4-codex` validation, and CO-191 spark policy refactors.

## Parity / Alignment Matrix
- Current truth: CO policy and docs still target `0.118.0`; prior `0.120.0` candidates were held because required cloud evidence was missing.
- Reference truth: official `rust-v0.121.0` release, OpenAI changelog, npm `@openai/codex` dist-tags, and local `codex-cli 0.121.0` help surfaces.
- Target truth / intended delta: a dated decision that promotes to `0.121.0` only if required gates pass, or holds `0.118.0` while recording `0.121.0` as the latest stable candidate plus exact blocker classes.
- Explicitly out-of-scope differences: marketplace packaging, MCP Apps metadata, provider-worker appserver adoption, `gpt-5.4-codex`, and spark policy changes.

## Readiness Gate
- Not done if: evidence is not timestamped; local command surfaces are incomplete; cloud-required and fallback outcomes are not explicit; auth-profile rotation is untested; docs/task mirrors disagree; P0/P1 regressions remain unresolved.
- Pre-implementation issue-quality review evidence: approved in this spec and in the Linear workpad. The issue has protected terms, a parity matrix, non-goals, and a clear "not done if" contract.
- Safeguard ownership split: child lane owns only `child-release-facts.md`; parent owns tracked docs, policy, canary execution, workpad, validation, PR, and final decision.

## Technical Requirements
- Functional requirements:
  1. Capture official `0.121.0` release facts from GitHub/OpenAI and npm latest facts with timestamps.
  2. Capture local `codex` command surfaces under `0.121.0`.
  3. Run `node scripts/runtime-mode-canary.mjs`.
  4. Run required cloud and fallback canaries, or record exact blockers.
  5. Validate multi-auth rotation at the safe command/config boundary.
  6. Record promote/hold decision across active docs and task mirrors.
  7. Prove no P0/P1 regression for provider exec/resume, review wrapper, delegation MCP, and appserver/exec-server guardrails.
- Non-functional requirements (performance, reliability, security): artifacts must be task-scoped; auth output must avoid secret leakage; docs must stay concise and machine-checkable; guardrails cannot be weakened to force promotion.
- Interfaces / contracts: Codex CLI help surfaces, npm registry metadata, `scripts/runtime-mode-canary.mjs`, `scripts/cloud-canary-ci.mjs`, `docs-catalog` version posture checks, docs freshness registry, Linear workpad contract.

## Architecture & Data
- Architecture / design adjustments: no runtime architecture changes planned. Update docs/policy/checklists and evidence artifacts only unless canaries reproduce a concrete defect.
- Data model changes / migrations: none.
- External dependencies / integrations: GitHub release page, OpenAI changelog, npm registry, local Codex CLI, Codex Cloud credentials/environment, Linear, GitHub PR checks.

## Validation Plan
- Tests / checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `node scripts/runtime-mode-canary.mjs`
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary` or exact blocker
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary` or exact blocker for the required fallback promotion gate
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review with `FORCE_CODEX_REVIEW=1`
  - explicit elegance/minimality pass
- Rollout verification: PR attached to CO-195, ready-review drain clean, Linear workpad refreshed before `In Review`.
- Monitoring / alerts: PR checks and ready-review automated-feedback drain.

## Open Questions
- Answered 2026-04-16: `CODEX_CLOUD_ENV_ID` is not configured in this provider workspace; required cloud promotion evidence is blocked.
- Answered 2026-04-16: auth rotation stayed at boundary-validation level and did not reproduce a linked Bug candidate.
- Answered 2026-04-16: final posture holds the active `0.118.0` target and records `0.121.0` as the latest audited stable candidate.

## Approvals
- Reviewer: Parent provider worker self-review before implementation; docs-review succeeded at `.runs/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1-co-195-docs-review-r3/cli/2026-04-15T23-10-57-461Z-e2b822df/manifest.json`.
- Date: 2026-04-16
