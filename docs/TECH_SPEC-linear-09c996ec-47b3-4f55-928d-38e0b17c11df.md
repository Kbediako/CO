---
id: 20260421-linear-09c996ec-47b3-4f55-928d-38e0b17c11df
title: CO rebaseline marketplace-dependent downstream-smoke policy beyond Codex CLI 0.121.0
relates_to: docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

# TECH_SPEC - CO: rebaseline marketplace-dependent downstream-smoke policy beyond Codex CLI 0.121.0

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- PRD: `docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- Task checklist: `tasks/tasks-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`

## Summary
- Objective: record the final `CO-275` marketplace-smoke decision after current `origin/main` landed `CO-268`.
- Decision: replace the temporary `@openai/codex@0.121.0` / `codex marketplace add` release-facing smoke pin with the validated `@openai/codex@0.122.0` / `codex plugin marketplace add` contract.
- Scope: docs/checklist/registry closeout plus validation that mainline `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` align.
- Non-scope: active CO compatibility target promotion, cloud-canary policy changes, provider-worker app-server migration, package architecture redesign, or weakening marketplace smoke fail-closed behavior.

## Issue-Shaping Contract
- User-request translation carried forward: decide whether post-`0.121.0` Codex CLIs regain a marketplace-compatible surface or CO revises the marketplace-dependent `pack:smoke` contract. Current mainline evidence chooses the second path through `codex plugin marketplace add`.
- Protected terms: `Codex CLI 0.122.0`, `Codex CLI 0.121.0`, `codex marketplace add`, `codex plugin marketplace add`, `pack:smoke`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `@openai/codex@0.121.0`, `@openai/codex@0.122.0`, `CO-196`, `CO-217`, and `CO-269`.
- Wrong interpretations rejected: generic `0.122.0` promotion, cloud-canary rework, provider-worker runtime redesign, optional marketplace coverage, or reverting the merged `CO-268` contract back to the old command.

## Technical Requirements
1. Keep the prior `0.121.0` versus `0.122.0` old-command evidence attached to `CO-275`.
2. Treat the merged `CO-268` implementation as the replacement contract for this issue.
3. Preserve `CO-196` packaged marketplace architecture and `CO-217` mandatory coverage semantics.
4. Ensure `docs/guides/codex-version-policy.md` records the `CO-268` supersession and this `CO-275` closeout.
5. Keep `tests/pack-smoke.spec.ts` and the protected workflows aligned on `@openai/codex@0.122.0`.

## Acceptance Mapping
- Evidence capture: prior CO-275 artifact records `0.121.0 marketplace --help` versus `0.122.0 marketplace --help`; `CO-268` records `0.122.0 plugin marketplace add/remove` evidence.
- Decision: replacement-contract path accepted.
- If requirement changes: current mainline already updates script, tests, workflows, and docs together.
- Linkage: docs/checklists/workpad keep `CO-196`, `CO-217`, and `CO-269` explicit.

## Validation Plan
- `rg` protected contract terms across policy docs, pack-smoke script, tests, workflows, and CO-275 packet files.
- Focused `npx vitest run tests/pack-smoke.spec.ts tests/cloud-canary-ci.spec.ts`.
- Required repo gates per AGENTS before handoff: delegation guard, spec guard, build, lint, test, docs checks, freshness, stewardship, diff budget, review/elegance where applicable, and pack smoke for downstream-facing surfaces.
