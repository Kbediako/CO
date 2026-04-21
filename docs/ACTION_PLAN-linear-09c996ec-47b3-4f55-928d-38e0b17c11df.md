# ACTION_PLAN - CO: rebaseline marketplace-dependent downstream-smoke policy beyond Codex CLI 0.121.0

## Summary
- Goal: record the evidence-backed policy for marketplace-dependent downstream smoke after `Codex CLI 0.121.0`: keep `codex marketplace add` mandatory for `pack:smoke`, keep release-facing workflows pinned to marketplace-capable `@openai/codex@0.121.0`, and require any newer Codex CLI candidate to prove the same marketplace surface before replacing that pin.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned pack-smoke/test/workflow rationale, evidence capture, and parent-owned focused validation.
- Assumptions:
  - the parent provider source and accepted docs child-lane source are both available
  - `CO-269` is the handoff-provided split-policy lineage anchor
  - fresh `CO-275` evidence confirms `@openai/codex@0.122.0` still lacks `codex marketplace add`
  - the smallest parent implementation preserves the fail-closed marketplace proof contract and adds explicit rationale rather than redesigning release workflows

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
  - release-facing workflows remain pinned to `0.121.0` without explicit long-term rationale and a newer-candidate replacement gate
  - `pack:smoke` can pass as marketplace proof without `codex marketplace add` coverage or explicit non-coverage evidence
  - parent implementation replaces or weakens `CO-196` / `CO-217`
- Pre-implementation issue-quality review:
  - 2026-04-21: this is a parity/alignment lane because exact version pins, workflow names, and lineage issue references are part of the requested correctness contract. The micro-task path is unavailable.

## Milestones & Sequencing
1. Create the `CO-275` docs-first packet and registry mirrors within the declared docs scope.
2. Parent reviews `CO-269` and captures fresh `0.121.0` versus `0.122.0` marketplace capability evidence under the `CO-275` artifact path.
3. Parent inspects `scripts/pack-smoke.mjs` to confirm `codex marketplace add` support detection and skip/fail evidence remain the correct steady-state contract.
4. Parent updates `tests/pack-smoke.spec.ts` wording/comments so the dedicated Codex install proof is described as the current marketplace-capable pin policy, not obsolete proof.
5. Parent updates `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` with explicit rationale for keeping `@openai/codex@0.121.0` before release-facing `npm run pack:smoke`.
6. Parent records the replacement gate: a newer candidate may replace `@openai/codex@0.121.0` only after `codex marketplace add` is available and `pack:smoke` passes without `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP`.
7. Parent runs focused pack-smoke/workflow tests and final `npm run pack:smoke`.
8. Parent carries the normal docs/spec/review/PR lifecycle after implementation.

## Dependencies
- Provider worker source 0 anchor: `ctx:sha256:cf4c59c717166639a22858ac56e882dec0a882ed6b6255cb9fd4b57d1e75911d#chunk:c000001`
- Provider worker source payload: `../../.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/cli/2026-04-21T04-28-02-978Z-439d6089/memory/source-0/source.txt`
- Docs child-lane source 0 anchor: `ctx:sha256:0e9cc806c03afdcd2ad2aeccf80f57549868a86ca946747d78aee3d131e0c83f#chunk:c000001`
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
  - revert parent marketplace policy edits if they weaken marketplace coverage, break workflow posture proof, or conflict with the `CO-269` split-policy baseline

## Risks & Mitigations
- Risk: the parent performs a raw version string bump to `0.122.0` even though it lacks `codex marketplace add`.
  - Mitigation: require fresh command-surface evidence and keep `0.122.0` classified as cloud-canary-only until marketplace proof exists.
- Risk: 0.121.0 lineage is erased, losing the CO-196/CO-217 audit path.
  - Mitigation: preserve 0.121.0 as the current marketplace-capable release-facing smoke pin and retain CO-196/CO-217/CO-269 linkage.
- Risk: a newer Codex CLI marketplace surface differs enough to require pack-smoke behavior changes.
  - Mitigation: keep `codex marketplace add` support detection and non-coverage evidence explicit in `scripts/pack-smoke.mjs`.

## Approvals
- Docs packet child lane: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`
- Parent docs-review: pending parent lane
- Parent implementation/review/PR lifecycle: pending parent lane
