# Task Checklist - linear-09c996ec-47b3-4f55-928d-38e0b17c11df

- Linear Issue: `CO-275` / `09c996ec-47b3-4f55-928d-38e0b17c11df`
- MCP Task ID: `linear-09c996ec-47b3-4f55-928d-38e0b17c11df`
- Primary PRD: `docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- TECH_SPEC: `tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- Shared source 0 anchor: `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`
- Origin manifest: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`

## Docs-First
- [x] PRD drafted for marketplace `pack:smoke` alignment with `Codex CLI 0.122.0` while preserving `Codex CLI 0.121.0` lineage. Evidence: `docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, non-goals, wrong interpretations to reject, `Not done if`, and acceptance criteria. Evidence: `tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`, `docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`. Evidence: `.agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md` readiness gate.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, or `.github/workflows/**`. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Parent Acceptance Criteria
- [ ] Parent confirms `CO-269` and decides the exact `Codex CLI 0.122.0` marketplace proof posture.
- [ ] Parent preserves `Codex CLI 0.121.0` / `@openai/codex@0.121.0` as lineage or deliberate fallback compatibility evidence.
- [ ] Parent updates `tests/pack-smoke.spec.ts` so workflow posture assertions align with `@openai/codex@0.122.0` or an explicit dual-version policy.
- [ ] Parent updates `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` so `npm run pack:smoke` uses the intended marketplace-capable Codex install.
- [ ] Parent preserves `codex marketplace add` coverage and explicit non-coverage skip evidence in `scripts/pack-smoke.mjs`.
- [ ] Parent keeps `CO-196`, `CO-217`, and `CO-269` traceable in implementation/review evidence.

## Validation
- [x] Child scoped JSON parse and registry presence check. Evidence: `node -e` parsed `tasks/index.json` and `docs/docs-freshness-registry.json`, found `20260421-linear-09c996ec-47b3-4f55-928d-38e0b17c11df`, and confirmed six freshness entries.
- [x] Child scoped protected-term scan over packet and mirrors. Evidence: `rg -n "Codex CLI 0\\.122\\.0|Codex CLI 0\\.121\\.0|codex marketplace add|pack:smoke|scripts/pack-smoke\\.mjs|tests/pack-smoke\\.spec\\.ts|\\.github/workflows/core-lane\\.yml|\\.github/workflows/release\\.yml|\\.github/workflows/pack-smoke-backstop\\.yml|@openai/codex@0\\.121\\.0|@openai/codex@0\\.122\\.0|CO-196|CO-217|CO-269" docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/tasks-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md .agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/tasks-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md .agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [ ] Parent focused `npx vitest run tests/pack-smoke.spec.ts`.
- [ ] Parent `npm run pack:smoke`.
- [ ] Parent docs/spec/review gates after implementation.

## Progress Log
- 2026-04-21: bounded same-issue docs child lane created the `CO-275` docs-first packet and registry mirrors against source anchor `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`. The declared shared source payload was absent in this child checkout, so the packet is anchored on the protected handoff wording and current repo marketplace smoke posture. The packet preserves `Codex CLI 0.122.0`, `Codex CLI 0.121.0`, `codex marketplace add`, `pack:smoke`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, the three protected workflows, `@openai/codex@0.121.0`, `@openai/codex@0.122.0`, `CO-196`, `CO-217`, and `CO-269`.
