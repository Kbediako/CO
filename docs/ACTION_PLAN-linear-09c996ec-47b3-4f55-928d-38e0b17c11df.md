# ACTION_PLAN - CO: align marketplace pack:smoke with Codex CLI 0.122.0

## Summary
- Goal: give the parent lane a bounded docs-first plan for aligning marketplace `pack:smoke` proof with `Codex CLI 0.122.0` / `@openai/codex@0.122.0` without weakening the `Codex CLI 0.121.0` / `@openai/codex@0.121.0` lineage from `CO-196` and `CO-217`.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned pack-smoke/test/workflow implementation, and parent-owned focused validation.
- Assumptions:
  - the shared source payload is absent in this child checkout
  - `CO-269` is the handoff-provided 0.122.0 lineage anchor
  - the smallest parent implementation will update marketplace smoke version proof and assertions, not redesign release workflows

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - the docs packet misses any protected term
  - workflow/test proof remains stale 0.121-only while claiming 0.122.0 readiness
  - `pack:smoke` can pass as marketplace proof without `codex marketplace add` coverage or explicit non-coverage evidence
  - parent implementation replaces or weakens `CO-196` / `CO-217`
- Pre-implementation issue-quality review:
  - 2026-04-21: this is a parity/alignment lane because exact version pins, workflow names, and lineage issue references are part of the requested correctness contract. The micro-task path is unavailable.

## Milestones & Sequencing
1. Create the `CO-275` docs-first packet and registry mirrors within the declared docs scope.
2. Parent reviews `CO-269` and confirms whether 0.122.0 is the active release-facing marketplace smoke proof or a candidate that must be dual-tracked.
3. Parent inspects `scripts/pack-smoke.mjs` to confirm `codex marketplace add` support detection and skip/fail evidence remain correct under 0.122.0.
4. Parent updates `tests/pack-smoke.spec.ts` so the dedicated Codex install proof, assertion text, and workflow posture expectations align with `@openai/codex@0.122.0` or an explicit dual-version policy.
5. Parent updates `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` so `npm run pack:smoke` uses the intended marketplace-capable Codex install before release-facing proof.
6. Parent preserves `@openai/codex@0.121.0` only as lineage or deliberate fallback/compatibility evidence.
7. Parent runs focused pack-smoke/workflow tests and final `npm run pack:smoke`.
8. Parent carries the normal docs/spec/review/PR lifecycle after implementation.

## Dependencies
- Shared source 0 anchor: `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`
- Origin manifest: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`
- Parent source/test/workflow surfaces:
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
- Version/package surfaces:
  - `Codex CLI 0.122.0`
  - `Codex CLI 0.121.0`
  - `@openai/codex@0.122.0`
  - `@openai/codex@0.121.0`
- Lineage issues:
  - `CO-196`
  - `CO-217`
  - `CO-269`

## Validation
- Child lane only:
  - `node -e` parse and presence check for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `rg -n "Codex CLI 0\\.122\\.0|Codex CLI 0\\.121\\.0|codex marketplace add|pack:smoke|scripts/pack-smoke\\.mjs|tests/pack-smoke\\.spec\\.ts|\\.github/workflows/core-lane\\.yml|\\.github/workflows/release\\.yml|\\.github/workflows/pack-smoke-backstop\\.yml|@openai/codex@0\\.121\\.0|@openai/codex@0\\.122\\.0|CO-196|CO-217|CO-269" <CO-275 packet files>`
  - `git diff --check -- <declared docs scope>`
- Parent implementation lane:
  - focused `npx vitest run tests/pack-smoke.spec.ts`
  - `npm run pack:smoke`
  - workflow posture review for the three protected workflows
  - parent-selected docs/spec/review gates before PR handoff
- Rollback plan:
  - revert parent 0.122.0 marketplace smoke alignment if it weakens marketplace coverage, breaks workflow posture proof, or conflicts with `CO-269`

## Risks & Mitigations
- Risk: the parent performs a raw version string bump and leaves assertion text or workflow proof stale.
  - Mitigation: require focused `tests/pack-smoke.spec.ts` updates and workflow posture review.
- Risk: 0.121.0 lineage is erased, losing the CO-196/CO-217 audit path.
  - Mitigation: preserve 0.121.0 as previous marketplace-capable proof or explicit fallback compatibility evidence.
- Risk: 0.122.0 marketplace support differs enough to require pack-smoke behavior changes.
  - Mitigation: keep `codex marketplace add` support detection and non-coverage evidence explicit in `scripts/pack-smoke.mjs`.

## Approvals
- Docs packet child lane: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`
- Parent docs-review: pending parent lane
- Parent implementation/review/PR lifecycle: pending parent lane
