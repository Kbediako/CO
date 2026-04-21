# Task Checklist - linear-09c996ec-47b3-4f55-928d-38e0b17c11df

- Linear Issue: `CO-275` / `09c996ec-47b3-4f55-928d-38e0b17c11df`
- MCP Task ID: `linear-09c996ec-47b3-4f55-928d-38e0b17c11df`
- Primary PRD: `docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- TECH_SPEC: `tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- Provider worker source 0 anchor: `ctx:sha256:cf4c59c717166639a22858ac56e882dec0a882ed6b6255cb9fd4b57d1e75911d#chunk:c000001`
- Provider worker source payload: `../../.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/cli/2026-04-21T04-28-02-978Z-439d6089/memory/source-0/source.txt`
- Docs child-lane source 0 anchor: `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`
- Origin manifest: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`

## Docs-First
- [x] PRD drafted for the marketplace-dependent downstream-smoke policy rebaseline beyond `Codex CLI 0.121.0`, preserving `Codex CLI 0.121.0` as the current marketplace-capable pin and `Codex CLI 0.122.0` as the incompatible cloud-canary candidate lineage. Evidence: `docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
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
- [x] Parent confirms `CO-269` and records fresh `Codex CLI 0.121.0` versus `Codex CLI 0.122.0` marketplace capability evidence. Evidence: `out/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/manual/codex-marketplace-policy/marketplace-capability-compare.log`.
- [x] Parent preserves `Codex CLI 0.121.0` / `@openai/codex@0.121.0` as the current release-facing marketplace-capable smoke pin. Evidence: `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `docs/guides/codex-version-policy.md`.
- [x] Parent updates `tests/pack-smoke.spec.ts` so workflow posture assertions describe the marketplace-capable pin policy and its newer-candidate replacement gate. Evidence: `tests/pack-smoke.spec.ts`.
- [x] Parent updates `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` so `npm run pack:smoke` uses the intended marketplace-capable Codex install with explicit rationale. Evidence: workflow comments and focused tests.
- [x] Parent preserves `codex marketplace add` coverage and explicit non-coverage skip evidence in `scripts/pack-smoke.mjs`. Evidence: no script behavior change; policy docs keep fail-closed contract.
- [x] Parent keeps `CO-196`, `CO-217`, and `CO-269` traceable in implementation/review evidence. Evidence: PRD, TECH_SPEC, ACTION_PLAN, task mirrors, version policy docs.

## Validation
- [x] Child scoped JSON parse and registry presence check. Evidence: `node -e` parsed `tasks/index.json` and `docs/docs-freshness-registry.json`, found `20260421-linear-09c996ec-47b3-4f55-928d-38e0b17c11df`, and confirmed six freshness entries.
- [x] Child scoped protected-term scan over packet and mirrors. Evidence: `rg -n "Codex CLI 0\\.122\\.0|Codex CLI 0\\.121\\.0|codex marketplace add|pack:smoke|scripts/pack-smoke\\.mjs|tests/pack-smoke\\.spec\\.ts|\\.github/workflows/core-lane\\.yml|\\.github/workflows/release\\.yml|\\.github/workflows/pack-smoke-backstop\\.yml|@openai/codex@0\\.121\\.0|@openai/codex@0\\.122\\.0|CO-196|CO-217|CO-269" docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/tasks-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md .agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/TECH_SPEC-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/tasks-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md .agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [x] Parent focused `npx vitest run tests/pack-smoke.spec.ts tests/cloud-canary-ci.spec.ts`. Evidence: 2 files / 16 tests passed on 2026-04-21.
- [ ] Parent `npm run pack:smoke`.
- [ ] Parent docs/spec/review gates after implementation.

## Progress Log
- 2026-04-21: bounded same-issue docs child lane created the `CO-275` docs-first packet and registry mirrors against docs child source anchor `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`; the parent provider worker source anchor is `ctx:sha256:cf4c59c717166639a22858ac56e882dec0a882ed6b6255cb9fd4b57d1e75911d#chunk:c000001`. Both source payloads are available, and the packet is anchored on the protected handoff wording and current repo marketplace smoke posture. The packet preserves `Codex CLI 0.122.0`, `Codex CLI 0.121.0`, `codex marketplace add`, `pack:smoke`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, the three protected workflows, `@openai/codex@0.121.0`, `@openai/codex@0.122.0`, `CO-196`, `CO-217`, and `CO-269`.
