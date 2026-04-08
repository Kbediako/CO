# TECH_SPEC - Codex 0.110 Version Policy Refresh + Adoption Sequencing

- Canonical TECH_SPEC: `tasks/specs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: docs-first planning-only lane to refresh version-policy framing from completed audits and define ordered adoption slices (`1004-1008`).
- Boundary: no runtime code edits in this lane.
- Evidence rule: all research facts in findings must be tagged `confirmed` or `inferred`.

## Requirements
- Create docs-first artifacts for task `1004`:
  - `docs/PRD-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
  - `docs/TECH_SPEC-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
  - `docs/ACTION_PLAN-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
  - `tasks/specs/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
  - `tasks/tasks-1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
  - `.agent/task/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`
- Create findings docs with fact classification:
  - `docs/findings/1004-codex-cli-0110-upgrade-deliberation.md`
  - `docs/findings/1004-agents-router-simplification-deliberation.md`
- Define sequencing and conditions explicitly:
  - `1004` planning/docs refresh,
  - `1005` canary matrix + decision,
  - `1006` parser/wrapper hardening (conditional),
  - `1007` audit refresh,
  - `1008` AGENTS router simplification (phased; no merge-order changes).
- Record non-goals/risk controls:
  - plugin governance deferred,
  - no default flip without canary evidence.
- Update registries:
  - `tasks/index.json`,
  - `docs/TASKS.md`,
  - `docs/docs-freshness-registry.json`.
- Run validation/documentation gates:
  - docs-review gate,
  - `node scripts/spec-guard.mjs --dry-run`,
  - `npm run docs:check`,
  - `npm run docs:freshness`.
- Capture parity + summary artifacts in task evidence folder.

## Acceptance
- Findings clearly separate `confirmed` and `inferred` facts with source paths.
- Sequencing contract and risk controls are consistent across PRD/spec/checklist.
- Docs-review manifest path is recorded in checklist/spec and summary note.
- Requested docs checks are successful and logged in `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/<timestamp>-docs-first/`.
- Checklist parity log and short docs-first summary note exist with evidence links.

## Evidence Bundle
- Evidence root: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/`.
- External/local audits:
  - `01-local-codex-cli-audit.log`
  - `02b-external-openai-codex-release-audit.json`
  - `02c-external-openai-codex-release-summary.json`
  - `03-local-codex-fork-delta-audit.log`
  - `04b-local-agents-router-audit.log`
