---
id: 20260414-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d
title: CO Codex CLI 0.120.0 Adoption Posture
relates_to: docs/PRD-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md
risk: high
owners:
  - Codex
last_review: 2026-04-14
---

## Canonical Reference
- Task spec: `tasks/specs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`
- PRD: `docs/PRD-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`
- Task checklist: `tasks/tasks-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`

## Summary
CO-180 is a version-policy adoption lane. It audits local Codex CLI `0.120.0` against the current `0.118.0` posture gates, records the decision, and updates active truth surfaces only after evidence supports the posture.

## Requirements
- Preserve command-surface audit outputs for `codex --version`, `codex exec --help`, `codex exec resume --help`, `codex review --help`, and `codex login --help`.
- Run `node scripts/runtime-mode-canary.mjs` or record an exact blocker.
- Run or explicitly waive the required cloud canary contract and cloud fallback contract with command and environment evidence.
- Decide promotion versus hold before editing active version truth surfaces.
- If promoting, align docs-catalog checked docs and active policy docs to Codex CLI `0.120.0`.
- If holding, document why local `0.120.0` drift is acceptable without changing the current target.

## Evidence
- Child audit lane: same-issue child lane `audit-evidence`.
- Parent audit root: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/`.
- Run root: `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/`.
- Decision: hold `0.118.0`, recorded in `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-version-canary/compare/decision-go-no-go.md`.
- Gate summary: command surfaces passed, runtime canary rerun passed, required cloud canary is blocked by missing `CODEX_CLOUD_ENV_ID`, and fallback manifest recorded `mode_used=mcp` while the required wrapper still exits failed under missing-env configuration.

## Validation Plan
- Required gates: delegation guard, spec guard, build, lint, test, docs check, docs freshness, repo stewardship, diff budget, manifest-backed standalone review, elegance pass, and PR ready-review drain before handoff.
- Focused audit checks: current command help surfaces and canary/waiver evidence.
- Docs consistency checks: `docs:check` must keep `codex-cli-version` truth checks aligned to `docs/guides/codex-version-policy.md`.

## Approvals
- Docs-review: clean-success in `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d-co-180-docs-review-r2/cli/2026-04-14T10-06-30-092Z-440706ce/manifest.json`.
- Standalone review: pending before PR handoff.
- Date: 2026-04-14
