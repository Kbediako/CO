# ACTION_PLAN - CO-352 Codex 0.125 Model-Catalog Posture

## Summary
- Goal: prepare CO-352 to validate Codex CLI `0.125` model-catalog posture without changing shipped defaults prematurely.
- Scope: PRD, TECH_SPEC, ACTION_PLAN, and `tasks/index.json` registry row for the docs phase.
- Assumptions: parent lane is concurrently collecting canary evidence and owns Linear state, workpad, implementation, PR lifecycle, and final posture reconciliation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserved in the PRD and TECH_SPEC, including `codex debug models`, `gpt-5.5`, `gpt-5.4`, `provider-linear-worker`, `codex review`, `cloud-canary`, `missing_environment`, `explorer_fast`, and `gpt-5.3-codex-spark`.
- Not done if: shipped/generated defaults are promoted from catalog listing alone, evidence classes are incomplete, cloud fallback is misstated as cloud support, or downstream/no-network `explorer_fast` is not validated.
- Pre-implementation issue-quality review: approved for docs-first execution because CO-352 is a high-risk posture/alignment lane whose correctness depends on exact artifact names, exact surfaces, and protected wording.

## Milestones & Sequencing
1. Create the docs-first packet and register the TECH_SPEC in `tasks/index.json`.
2. Parent captures exact `0.125` source evidence, local CLI/auth state, live/bundled catalog output, app-server model list, and top-level smoke results.
3. Parent captures delegated/provider-worker, standalone review, cloud/fallback, and downstream/no-network `explorer_fast` evidence.
4. Parent classifies every surface as promote, hold, blocker, or no-op, preserving CO-341 portable-default posture unless every required gate passes.
5. Parent applies the smallest implementation delta supported by evidence, or records a no-op/hold decision if evidence is insufficient.
6. Parent runs docs-review before implementation, then focused checks, standalone review, elegance pass, and any required full validation or pack smoke after implementation.

## Dependencies
- Parent source anchor: `ctx:sha256:3cf28c7e9319e4f963d4249bf02c3325281966ef0e16dd3c1954bb03cce49ca2#chunk:c000001`.
- Exact Codex CLI `0.125` candidate and official source evidence.
- Local ChatGPT-auth CLI access for top-level probes.
- Provider-worker and app-server surfaces for delegated/runtime probes.
- Cloud environment or exact fallback evidence, especially `CODEX_CLOUD_ENV_ID` / `missing_environment`.
- Downstream package smoke path capable of verifying no-network `explorer_fast` behavior.

## Validation
- Checks / tests for this child lane:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8'))"`
  - `git diff --check -- docs/PRD-codex-0125-model-catalog-posture.md tasks/specs/CO-352-codex-0125-model-catalog-posture.md docs/ACTION_PLAN-codex-0125-model-catalog-posture.md tasks/index.json`
- Parent implementation checks:
  - docs-review before implementation.
  - Top-level `codex exec` model smoke.
  - Delegated/provider-worker `codex exec` / `codex exec resume` evidence or blocker.
  - Standalone review / `review_model` evidence.
  - Cloud canary or exact fallback contract.
  - Downstream/no-network `explorer_fast` smoke.
  - Full validation floor and `pack:smoke` when downstream-facing surfaces change.
- Rollback plan: keep `gpt-5.4` / `xhigh` shipped defaults and record hold/blocker evidence if any required gate fails or remains unproven.

## Risks & Mitigations
- Risk: `codex debug models` lists `gpt-5.5` and is mistaken for portable default proof. Mitigation: require every evidence class before default changes.
- Risk: live catalog, bundled catalog, and app-server model list disagree. Mitigation: classify the disagreement and hold defaults until the parent resolves it.
- Risk: top-level local ChatGPT-auth works but provider-worker, review, cloud, or downstream package flows do not. Mitigation: keep local opt-in marker behavior separate from shipped defaults.
- Risk: no-network downstream behavior regresses. Mitigation: require focused `explorer_fast` package smoke before changing model role defaults.
- Risk: docs child lane exceeds ownership. Mitigation: child writes only the scoped docs packet and registry row, leaving implementation and Linear mutation to the parent.

## Approvals
- Reviewer: bounded same-issue docs child lane; parent review pending.
- Date: 2026-04-24
