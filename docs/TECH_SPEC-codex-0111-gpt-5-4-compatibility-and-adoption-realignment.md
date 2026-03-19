# TECH_SPEC - Codex 0.111 + GPT-5.4 Compatibility + Adoption Realignment (1012)

- Canonical TECH_SPEC: `tasks/specs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: restore local compatibility and align CO docs/defaults/templates/tests to a `gpt-5.4` baseline for Codex CLI `0.111.0` with ChatGPT auth.
- Adopt-now baseline:
  - top-level `model = "gpt-5.4"`,
  - `review_model = "gpt-5.4"`,
  - managed and local high-reasoning subagent role files use `gpt-5.4`,
  - `explorer_fast` stays `gpt-5.3-codex-spark`.
- Hold boundary: no `gpt-5.4-codex` default adoption while ChatGPT auth rejects it.

## Requirements
- Create and maintain 1012 docs-first artifacts:
  - `docs/PRD-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
  - `docs/TECH_SPEC-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
  - `docs/ACTION_PLAN-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
  - `tasks/specs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
  - `tasks/tasks-1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
  - `.agent/task/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
  - `docs/findings/1012-codex-0111-gpt-5-4-compatibility-deliberation.md`
- Update registries:
  - `tasks/index.json`,
  - `docs/TASKS.md`,
  - `docs/docs-freshness-registry.json`.

## Local Compatibility Contract
- Confirm current runtime behavior with direct local probes:
  - `gpt-5.4` succeeds,
  - `gpt-5.4-codex` fails under ChatGPT auth with unsupported-model error.
- Repair the local ChatGPT-auth environment by moving these surfaces off unsupported `gpt-5.4-codex` and onto `gpt-5.4`:
  - `review_model`,
  - `~/.codex/agents/worker-complex.toml`,
  - `~/.codex/agents/researcher.toml`,
  - `~/.codex/agents/explorer-detailed.toml`.
- If native `codex` startup fails with `invalid type: integer ... expected struct AgentRoleToml` under `[agents]`, remove only the live `max_depth` and `max_spawn_depth` keys from `~/.codex/config.toml`, keep `max_threads` plus role subtables unchanged, and capture before/after evidence.

## Repo Realignment Contract
- Update CO starter config/defaults/advisories to the `gpt-5.4` baseline:
  - `templates/codex/.codex/config.toml`,
  - `orchestrator/src/cli/codexDefaultsSetup.ts`,
  - `orchestrator/src/cli/doctor.ts`,
  - docs/templates/tests that encode the baseline model or version policy.
- `doctor` must inspect `review_model` in addition to top-level `model`.
- `codex defaults` remains additive and must preserve unrelated config keys and existing role files unless `--force` is set.

## Hold / Exclusion Contract
- Do not change:
  - `explorer_fast` model,
  - RLM/alignment `gpt-5.3-codex` pins,
  - historical 1004 findings content except where cross-linked by new superseding docs.
- If docs-review or delegation-guard must be overridden while the compatibility repair is in-flight, the exact reason must be recorded in task evidence.

## Manual Simulated / Mock Test Requirements
1. Capture local `codex --version`.
2. Capture `codex exec --ephemeral --json -m gpt-5.4 'Reply with OK only.'` success for the target subagent/review baseline.
3. Capture `codex exec --ephemeral --json -m gpt-5.4-codex 'Reply with OK only.'` failure with the unsupported ChatGPT-auth error.
4. Capture local config/role-file snapshots before and after compatibility repair.
5. Capture a post-repair smoke showing that the selected review/high-reasoning subagent surface uses `gpt-5.4`.
6. If the live parser workaround is needed, capture successful `codex login status` and a fresh `codex exec --ephemeral --json -m gpt-5.4 'Reply with OK only.'` after removing only the offending live `[agents]` keys.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Docs-First Stream Validation (This Lane)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md .agent/task/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
- `node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task 1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment`

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/<implementation-gate-run-id>/manifest.json`
- Note: the successful 1012 docs-review run used a temporary `CODEX_HOME` before the live parser workaround was applied; post-fix native startup evidence is captured separately under `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/`.
