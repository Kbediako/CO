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
- `.agent` mirror: `.agent/task/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`

## Traceability
- Linear issue: `CO-275` / `09c996ec-47b3-4f55-928d-38e0b17c11df`
- Provider worker source 0 anchor: `ctx:sha256:cf4c59c717166639a22858ac56e882dec0a882ed6b6255cb9fd4b57d1e75911d#chunk:c000001`
- Provider worker source object id: `sha256:cf4c59c717166639a22858ac56e882dec0a882ed6b6255cb9fd4b57d1e75911d`
- Provider worker source payload: `../../.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/cli/2026-04-21T04-28-02-978Z-439d6089/memory/source-0/source.txt`
- Docs child-lane source 0 anchor: `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`
- Docs child-lane source payload: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`
- Shared source note: the parent provider source and accepted child-lane source are both available; the packet is anchored on the protected handoff wording and current repo marketplace smoke surfaces.

## Summary
- Objective: define the evidence-backed contract for marketplace-dependent downstream smoke after `Codex CLI 0.121.0`: keep `codex marketplace add` mandatory for `pack:smoke`, keep release-facing smoke workflows on marketplace-capable `@openai/codex@0.121.0`, and require newer candidates to prove the marketplace surface before replacing that pin.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-275`
  - parent-owned pack-smoke, workflow, and test implementation
  - parent-owned focused validation
- Constraints:
  - no edits to `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, or `.github/workflows/**` from this child lane
  - no Linear mutations from this child lane
  - no full repo validation from this child lane

## Issue-Shaping Contract
- User-request translation carried forward: this is a marketplace smoke policy rebaseline lane, not a generic Codex adoption or `0.122.0` promotion lane. Fresh evidence shows `@openai/codex@0.122.0` still cannot satisfy the `scripts/pack-smoke.mjs` `codex marketplace add` prerequisite, so parent implementation should record the keep-`0.121.0` marketplace pin and replacement gate.
- Protected terms / exact artifact and surface names:
  - `Codex CLI 0.122.0`
  - `Codex CLI 0.121.0`
  - `codex marketplace add`
  - `pack:smoke`
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `@openai/codex@0.121.0`
  - `@openai/codex@0.122.0`
  - `CO-196`
  - `CO-217`
  - `CO-269`
- Nearby wrong interpretations to reject:
  - generic Codex CLI version promotion
  - marketplace smoke optionality
  - workflow-only string bump without `tests/pack-smoke.spec.ts`
  - test-only string bump without workflow proof
  - replacing `CO-196` or weakening `CO-217`
  - treating the current `0.121.0` marketplace pin as stale while `0.122.0` lacks `codex marketplace add`
- Explicit non-goals carried forward:
  - no child-lane source, test, package, or workflow edits
  - no broad release pipeline redesign
  - no guardrail, delegation, runtime, or provider-worker policy changes
  - no Linear state mutation

## Parity / Alignment Matrix
- Current truth:
  - `scripts/pack-smoke.mjs` keeps marketplace support explicit through `codex marketplace add` detection and skip/fail evidence
  - `tests/pack-smoke.spec.ts` currently defines `npm install --global @openai/codex@0.121.0` as the workflow proof install command
  - `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` install `@openai/codex@0.121.0` before `npm run pack:smoke`
  - `CO-196` and `CO-217` are the existing marketplace path and mandatory marketplace-smoke hardening lineage
- Reference truth:
  - `CO-196` proves the marketplace/plugin distribution path
  - `CO-217` proves marketplace smoke is mandatory by default and skips are explicit non-coverage evidence
  - `CO-269` is the handoff-provided split-policy lineage anchor for this issue
  - `Codex CLI 0.121.0` is the current marketplace-capable proof baseline for release-facing smoke
- Target truth / intended delta:
  - parent implementation records that release-facing marketplace smoke remains pinned to `Codex CLI 0.121.0` / `@openai/codex@0.121.0`
  - `@openai/codex@0.122.0` remains the cloud-canary candidate from `CO-269`, not marketplace smoke proof
  - `codex marketplace add` coverage remains mandatory inside `pack:smoke`
  - workflow and test assertions agree on the intended proof version and cannot silently drift
- Explicitly out-of-scope differences:
  - non-marketplace Codex CLI adoption posture
  - release signing/publish semantics
  - cloud canary or runtime-mode adoption
  - package descriptor redesign beyond what parent determines is needed for 0.122.0 marketplace smoke

## Readiness Gate
- Not done if:
  - any protected term from the handoff is absent from the packet
  - workflows/tests leave `@openai/codex@0.121.0` pinned without explicit long-term rationale and a newer-candidate replacement gate
  - `pack:smoke` can pass as marketplace proof without `codex marketplace add` coverage or explicit non-coverage evidence
  - `CO-196`, `CO-217`, or `CO-269` lineage is omitted
  - child lane edits implementation, test, or workflow files
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: the handoff-protected surfaces make the issue a parity/alignment lane, not a micro-task. Correctness depends on exact version pins, workflow names, protected implementation/test surfaces, and lineage issues, so the micro-task path is ineligible.
  - 2026-04-21: the parent provider source and accepted child-lane source are both available; the packet preserves the handoff terms and current repo evidence while leaving source-of-truth issue/workpad reconciliation to the parent.
- Safeguard ownership split:
  - child lane owns docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - parent lane owns source/test/workflow inspection, implementation, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Create docs-first packet and mirrors for `CO-275`.
  2. Preserve traceability for `Codex CLI 0.122.0`, `Codex CLI 0.121.0`, `@openai/codex@0.122.0`, and `@openai/codex@0.121.0`.
  3. Preserve `codex marketplace add` as the marketplace proof surface inside `pack:smoke`.
  4. Parent updates `tests/pack-smoke.spec.ts` wording so workflow assertions describe `@openai/codex@0.121.0` as the current marketplace-capable pin.
  5. Parent adds release-facing workflow rationale so `npm run pack:smoke` stays preceded by the intended marketplace-capable Codex install.
  6. Parent preserves `CO-196`, `CO-217`, and `CO-269` traceability.
- Non-functional requirements:
  - bounded, reviewable implementation surface
  - machine-checkable marketplace coverage evidence
  - no silent fallback from marketplace proof to non-coverage evidence
  - no broad release pipeline churn
- Interfaces / contracts:
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `npm run pack:smoke`
  - `codex marketplace add`

## Architecture & Data
- Architecture / design adjustments:
  - parent should keep one explicit marketplace-capable Codex proof constant in `tests/pack-smoke.spec.ts` or a nearby helper
  - parent should update workflow install steps and assertions together so workflow and test truth cannot diverge
  - parent should preserve `scripts/pack-smoke.mjs` skip/fail semantics and only adjust prerequisite text or version behavior if required
- Data model changes / migrations:
  - no persistent data migration expected
  - task/docs registry rows only from this child lane
- External dependencies / integrations:
  - npm package `@openai/codex@0.122.0`
  - previous npm package `@openai/codex@0.121.0`
  - Codex CLI `codex marketplace add`

## Validation Plan
- Child-lane checks:
  - JSON parse / registry presence for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan across the `CO-275` packet and mirrors
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused `npx vitest run tests/pack-smoke.spec.ts`
  - `npm run pack:smoke`
  - workflow posture review for `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml`
  - parent docs/spec gates and review before PR handoff

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-21
