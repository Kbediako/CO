---
id: 20260424-linear-co-341-codex-0124-gpt55-posture
title: CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment
relates_to: docs/PRD-linear-co-341-codex-0124-gpt55-posture.md
risk: high
owners:
  - Codex
last_review: 2026-04-24
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: prove or hold promotion from `0.123.0` / `gpt-5.4` to `0.124.0` / `gpt-5.5` with `xhigh`, and align CO docs/defaults/workflow pins only after evidence.
- Scope: command-surface audit, runtime-mode canary, review/delegation/provider smoke, cloud-required/fallback canaries, pack-smoke/marketplace smoke, hook/config drift, docs mirrors, default-config setup, and focused tests.
- Constraints: use the clean CO-341 worktree, preserve dirty shared checkout changes, keep In Progress Linear issues at or below four, and preserve existing guardrail semantics.

## Issue-Shaping Contract
- User-request translation carried forward: continue the interrupted CO orchestration, use subagents, absorb the new `0.124.0` CLI update, use `gpt-5.5` `xhigh` where validated, keep the Orchestrator continuation hook enabled, and monitor/validate Linear issues until terminal evidence.
- Protected terms / exact artifact and surface names: `codex-cli 0.124.0`, `rust-v0.124.0`, `@openai/codex@0.124.0`, `gpt-5.5`, `model_reasoning_effort = "xhigh"`, `review_model`, `explorer_fast`, `codex_hooks`, `legacy_notify`, `hooks.json`, `co_orchestration_autocontinue.json`, `continue_co_orchestration.py`, `codex review`, `codex app-server`, `codex cloud`, `npm run ci:cloud-canary`, `npm run pack:smoke`, CO-337, CO-338, CO-340, and CO-341.
- Nearby wrong interpretations to reject: blind model/CLI promotion, duplicate Linear issue creation, disabling the hook, treating local exec success as cloud/review proof, or folding release publish recovery into this posture lane.
- Explicit non-goals carried forward: release publish execution, unrelated plugin cleanup, broad docs-freshness maintenance, delegation guard weakening, and changing `explorer_fast` away from spark search-only behavior.

## Parity / Alignment Matrix
- Current truth: repo policy and workflow pins are at `0.123.0`, model posture is `gpt-5.4`, local CLI is `0.124.0`, and the local `gpt-5.5` smoke succeeds after config cleanup.
- Reference truth: official GitHub release `rust-v0.124.0`, npm `@openai/codex@0.124.0`, OpenAI Codex model/config docs, and CO version-policy gates.
- Target truth / intended delta: policy mirrors, default setup, template config, workflow pins, and tests reflect `0.124.0` and validated `gpt-5.5` posture, with evidence artifacts under `out/linear-co-341-codex-0124-gpt55-posture/`.
- Explicitly out-of-scope differences: CO-338 release publish recovery, unrelated stale registry debt, and local temp plugin warnings unless they map to CO-shipped plugin metadata.

## Readiness Gate
- Not done if: promotion lacks cloud/review/delegation/provider evidence, local hook/config smoke still emits targeted 0.124 stale-feature or notify failures, or active Linear issue states are not truthful.
- Pre-implementation issue-quality review evidence: subagent validator `019dbbaf-b4cc-7791-a7ff-c8d262454e20` reported CO-341 is the canonical issue and no Linear corrections are needed; release scout `019dbbac-5349-72c1-b13b-b10a009dafc5` confirmed `0.124.0` and `gpt-5.5` availability with a docs-staleness caveat.
- Safeguard ownership split: parent Orchestrator owns final posture and Linear state changes; subagents provide read-only evidence; repo edits happen only in `/Users/kbediako/Code/CO-co341-codex-0124`.

## Technical Requirements
- Functional requirements:
  - Capture `codex --version`, npm package metadata, and release/tag evidence for `0.124.0`.
  - Capture `codex exec`, `codex exec resume`, `codex review`, `codex app-server`, `codex cloud`, MCP, plugin-marketplace, and feature-list surfaces.
  - Validate `gpt-5.5` with `xhigh` for top-level/local exec and delegated/subagent use.
  - Validate or hold `review_model = "gpt-5.5"` based on actual review/provider evidence.
  - Run or block runtime-mode, cloud-required, cloud-fallback, and pack-smoke gates with artifacts.
  - Update docs/defaults/workflow pins/tests consistently if promotion is GO.
  - Track residual warnings and Linear state transitions truthfully.
- Non-functional requirements (performance, reliability, security):
  - Do not introduce new secrets, auth assumptions, or production-impacting changes.
  - Preserve non-interactive CI behavior and deterministic review wrapper prompts.
  - Keep `explorer_fast` as the only explicit spark role and limit it to search-only guidance.
- Interfaces / contracts:
  - `templates/codex/.codex/config.toml`
  - `orchestrator/src/cli/codexDefaultsSetup.ts`
  - `docs/guides/codex-version-policy.md`
  - `AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`
  - `.github/workflows/cloud-canary.yml`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`
  - `tests/pack-smoke.spec.ts` and focused defaults/doctor tests

## Architecture & Data
- Architecture / design adjustments: no new runtime abstraction is planned. This is a posture/config/docs/test alignment around existing CO surfaces.
- Data model changes / migrations: none.
- External dependencies / integrations: Codex CLI `0.124.0`, GitHub release metadata, npm metadata, OpenAI Codex docs, Linear, and current cloud canary environment.

## Validation Plan
- Tests / checks:
  - local config/hook smoke: `codex exec --ephemeral --json -m gpt-5.5 "Reply with OK only."`
  - command audit: `codex --version`, `codex --help`, `codex exec --help`, `codex exec resume --help`, `codex review --help`, `codex app-server --help`, `codex cloud --help`, `codex features list`, and plugin marketplace help
  - `node scripts/runtime-mode-canary.mjs`
  - `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`
  - fallback cloud contract with `CLOUD_CANARY_EXPECT_FALLBACK=1`
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
- Rollout verification: CO-341 branch should merge through normal PR review; Linear comments should point to evidence artifacts and terminal validation.
- Monitoring / alerts: monitor CO-337, CO-338, CO-340, and CO-341 while In Progress count is capped at four; raise a new issue only for validated problems not already covered by CO-341.

## Open Questions
- `review_model = "gpt-5.5"` is locally validated for the CO review wrapper: `codex-orchestrator review` ran on Codex `0.124.0`, appserver runtime, `model: gpt-5.5`, and `xhigh` with manifest-backed evidence.
- `0.124.0` cloud-required and cloud-fallback execution remain open until the CO-341 branch is pushed and canary manifests are captured.
- Local plugin-manifest warnings are classified as temporary plugin cache noise for this lane unless future evidence maps them to CO-packaged plugin metadata.

## Approvals
- Reviewer: parent Orchestrator
- Date: 2026-04-24
