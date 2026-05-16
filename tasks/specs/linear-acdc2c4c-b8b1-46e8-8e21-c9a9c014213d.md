---
id: 20260414-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d
title: CO Codex CLI 0.120.0 Adoption Posture
status: done
owner: Codex
created: 2026-04-14
last_review: 2026-05-16
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md
related_action_plan: docs/ACTION_PLAN-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md
related_tasks:
  - tasks/tasks-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md
review_notes:
  - 2026-04-14: Issue-quality review approves the lane as a policy/adoption decision rather than a string bump or runtime rewrite. Required evidence covers local command surfaces, runtime-mode canary, cloud canary contract, cloud fallback contract, and provider-worker/review-wrapper assumptions.
  - 2026-04-14: Candidate audit decision holds the current `0.118.0` target. Local `codex-cli 0.120.0` command surfaces and runtime canary are green, but the required cloud canary contract is blocked by missing `CODEX_CLOUD_ENV_ID` in this provider workspace.
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; live `node bin/codex-orchestrator.js linear issue-context --issue-id acdc2c4c-b8b1-46e8-8e21-c9a9c014213d --format json` verified CO-180 is Linear Done/completed. No completed_at was inferred or fabricated.
---

# Technical Specification

## Context
Local CO sees `codex-cli 0.120.0`, but the active compatibility target in docs-catalog checked surfaces is still Codex CLI `0.118.0`. The version policy explicitly says not to carry the old target forward after baseline drift unless candidate posture evidence is recorded.

## Requirements
1. Capture task-scoped Codex CLI `0.120.0` audit evidence under the issue `.runs` and `out` roots.
2. Run or explicitly block/waive `node scripts/runtime-mode-canary.mjs`.
3. Run or explicitly block/waive the required cloud canary contract.
4. Run or explicitly block/waive the cloud fallback contract.
5. Decide promote to `0.120.0` or hold `0.118.0`.
6. If promoting, update active truth surfaces and docs-catalog checked docs consistently.
7. Confirm no P0/P1 provider-worker `codex exec` / `codex exec resume` or review-wrapper assumption regression.

## Issue-Shaping Contract
Protected terms: Codex CLI `0.120.0`, Codex CLI `0.118.0`, `docs/guides/codex-version-policy.md`, `codex exec`, `codex exec resume`, `codex review`, `codex login --device-auth`, runtime-mode canary, cloud canary contract, cloud fallback contract, provider-worker exec/resume assumptions, review-wrapper assumptions.

Wrong interpretations rejected: blind version-string bump, unrelated CO-77 public-doc cleanup, CO-89 resident-session implementation without real `exec` / `resume` regression, or invented cloud success without an actual credentialed run.

Explicit non-goals carried forward: no broad public-doc cleanup, no app-server/provider-worker runtime rewrite, and no unrelated Codex CLI capability adoption.

## Parity / Alignment Matrix
- Current truth: installed CLI is `codex-cli 0.120.0`; active docs target `0.118.0`.
- Reference truth: the version policy requires runtime/cloud evidence before promotion or re-carrying the old target after drift.
- Target truth: a dated, evidence-backed posture decision with active docs aligned.
- Out-of-scope differences: unrelated release-prep docs, resident app-server control seam, and broad upstream CLI feature adoption.

## Readiness Gate
- Not done if: active docs disagree after the decision, any required gate lacks run or waiver evidence, or compatibility is asserted without current command-surface proof.
- Pre-implementation issue-quality review evidence: this spec and the workpad preserve the full issue shaping contract before implementation edits.
- Safeguard ownership split: child lane owns audit artifacts only; parent owns docs/policy edits, validation, workpad, and PR handoff.

## Technical Requirements
- Functional requirements: audit, decide, update docs if needed, and validate.
- Non-functional requirements: evidence must be machine-checkable, dated, and task-scoped.
- Interfaces / contracts: docs-catalog `codex-cli-version` posture extraction from `docs/guides/codex-version-policy.md` must remain compatible with `scripts/docs-hygiene.ts`.

## Architecture & Data
- Architecture / design adjustments: documentation and policy posture only unless a canary exposes a real regression.
- Data model changes / migrations: none.
- External dependencies / integrations: Codex CLI, cloud canary environment, GitHub/Linear only for normal PR/workpad lifecycle.

## Validation Plan
- Tests / checks: command-surface audit, runtime-mode canary, cloud canary/fallback run-or-waiver, required repo gates, standalone review, elegance pass, and PR ready-review drain.
- Rollout verification: docs-catalog checked docs agree with the final posture and Linear workpad records final evidence.
- Monitoring / alerts: not applicable beyond PR checks and Linear handoff.

## Open Questions
- Closed 2026-04-14: cloud canary credentials/environment are not available in this provider workspace. Required and fallback cloud wrapper commands were run and recorded; missing `CODEX_CLOUD_ENV_ID` is the blocker/waiver reason for holding the target.

## Approvals
- Docs-review: clean-success in `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d-co-180-docs-review-r2/cli/2026-04-14T10-06-30-092Z-440706ce/manifest.json`.
- Standalone review: wrapper executed before PR handoff and failed at `failed-boundary` / `startup-anchor`; manual post-merge fallback review found no blocking issues in `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/12-post-merge-manual-review.md`.
- Date: 2026-04-14
