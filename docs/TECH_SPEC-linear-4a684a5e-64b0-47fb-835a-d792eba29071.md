---
id: 20260424-linear-4a684a5e-64b0-47fb-835a-d792eba29071
title: CO Codex CLI 0.124.0 and GPT-5.5 Posture
relates_to: docs/PRD-linear-4a684a5e-64b0-47fb-835a-d792eba29071.md
risk: high
owners:
  - Codex
last_review: 2026-04-24
---

## Summary
- Objective: decide and align CO posture for Codex CLI `0.124.0`, `gpt-5.5`, `model_reasoning_effort = "xhigh"`, hooks, local config hygiene, and marketplace-compatible smoke workflows.
- Scope: docs/tests/configuration plus focused smoke-script updates when evidence proves the `0.124.0` command surface satisfies the current contract.
- Constraints: preserve the dirty shared checkout, keep cloud/runtime gates evidence-based, and do not treat local ChatGPT-auth success as Codex Cloud or API-key proof.

## Issue-Shaping Contract
- User-request translation carried forward: run source, local, delegated, review, provider-worker, runtime, cloud, hook, config, and marketplace evidence before promoting or holding each surface.
- Protected terms / exact artifact and surface names: Codex CLI `0.124.0`, `rust-v0.124.0`, `gpt-5.5`, `model_reasoning_effort = "xhigh"`, `review_model`, `codex_hooks`, `hooks.json`, `legacy_notify`, `after_agent hook failed`, `remote_connections`, `skills`, `voice_transcription`, `Fast service tier`, `wait_agent`, `app-server multiple environments`, `codex exec`, `codex exec resume`, `codex review`, `provider-linear-worker`, `pack:smoke`, `cloud-canary`, `CODEX_CLOUD_ENV_ID`.
- Nearby wrong interpretations to reject: blind string bump, cloud/API proof from local ChatGPT auth, weaker canaries, ignored hook/config warnings, and marketplace policy changes without `plugin marketplace` proof.
- Explicit non-goals carried forward: no shared-root mutation, no unrelated release lane work, no broad app-server control rewrite, and no user config mutation.

## Parity / Alignment Matrix
- Current truth: `docs/guides/codex-version-policy.md` carries active target `0.123.0`, model posture `gpt-5.4`, release-facing smoke and cloud-canary `0.123.0`, and the `codex plugin marketplace add` marketplace smoke contract.
- Reference truth: OpenAI Codex docs recommend `gpt-5.5` when available; official `rust-v0.124.0` release facts add hooks, plugin marketplace, app-server, Fast tier, permission, `wait_agent`, MCP cwd, and unknown-feature/cloud-requirements changes.
- Target truth / intended delta: promote local ChatGPT-auth model surfaces that pass; promote CLI/workflow pins only after runtime/cloud/marketplace proof; hold Codex Cloud model choice with blocker evidence because Cloud cannot select `gpt-5.5` directly.
- Explicitly out-of-scope differences: CO-282, CO-278 baseline dirt, CO-338 npm publish recovery, and historical CO-337/CO-340 cleanup beyond superseding notes.

## Readiness Gate
- Not done if: active truth surfaces disagree, `0.124.0` or `gpt-5.5` is promoted without required surface evidence, or warning/hook drift remains untracked.
- Pre-implementation issue-quality review evidence: this spec preserves the issue wording, protected terms, non-goals, and parity matrix before source edits.
- Safeguard ownership split: same-issue child lane `source-evidence` completed with no patch; parent owns evidence file, docs packet, implementation, validation, workpad, and PR handoff.

## Technical Requirements
- Functional requirements:
  - Capture official source and local command evidence under the CO-341 `out/` root.
  - Update `codexDefaultsSetup` and related tests if `gpt-5.5` becomes the active local posture.
  - Update version policy, AGENTS/README truth, workflow pins, pack-smoke command expectations, and tests only for surfaces with proof.
  - Record hold buckets for unsupported or blocked Cloud/API/provider seams.
- Non-functional requirements: evidence must be dated, machine-checkable, and tied to CO-341 artifacts.
- Interfaces / contracts: `docs-hygiene` posture parsing, `pack:smoke` marketplace add/install flow, `cloud-canary` pinned install, `codex-orchestrator review`, and provider-worker runtime proof.

## Architecture & Data
- Architecture / design adjustments: posture/config/docs and smoke-command alignment only.
- Data model changes / migrations: none.
- External dependencies / integrations: Codex CLI, OpenAI Codex docs, GitHub release notes, Linear, Codex Cloud, and GitHub workflows.

## Validation Plan
- Tests / checks: delegation guard, spec guard dry-run, build, lint, test, docs:check, docs:freshness, repo stewardship, diff budget, standalone review, elegance review, and `pack:smoke` if downstream smoke surfaces change.
- Rollout verification: PR checks green, PR feedback handled, ready-review drain clean, and Linear workpad records final decision.
- Monitoring / alerts: Cloud canary and pack-smoke workflow pins keep future evidence reproducible.

## Open Questions
- PR attachment, checks, latest `origin/main`, and `pr ready-review` drain remain before Linear review handoff.
- Cloud/API direct `gpt-5.5` model choice remains held by official availability docs; local ChatGPT-auth top-level/delegated/review surfaces are promoted by current smoke evidence.

## Approvals
- Reviewer: docs-review child stream passed; final forced standalone review completed as bounded success; explicit elegance review completed.
- Date: 2026-04-24
