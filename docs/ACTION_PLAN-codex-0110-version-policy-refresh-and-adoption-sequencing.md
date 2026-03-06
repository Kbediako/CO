# ACTION_PLAN - Codex 0.110 Version Policy Refresh + Adoption Sequencing

## Summary
- Goal: finalize docs-first planning for task `1004` and define ordered downstream slices through `1008`.
- Scope: planning/docs artifacts, registry synchronization, and docs validation evidence only.
- Constraint: no runtime code edits in this slice.

## Milestones & Sequencing
1) Capture completed external/local audit facts (with classification)
- Output: two findings docs with explicit `confirmed` and `inferred` sections.

2) Draft docs-first planning artifacts
- Output: PRD + TECH_SPEC + ACTION_PLAN + task/spec/checklist + `.agent` mirror for `1004`.

3) Lock sequencing and risk controls
- Output: explicit slice map `1004 -> 1005 -> 1006 (conditional) -> 1007 -> 1008` with non-goals and risk controls.

4) Register planning artifacts
- Output: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json` entries for `1004` files.

5) Run docs validation and capture closeout evidence
- Output: docs-review manifest + docs guard logs + checklist parity log + short docs-first summary note.

## Downstream Slice Contract
- `1005` (next): run canary matrix and produce go/hold decision artifact.
- `1006` (conditional): execute parser/wrapper hardening only when `1005` evidence indicates parser/wrapper breakage.
- `1007`: refresh external/local audits after `1005/1006` updates and close drift.
- `1008`: simplify AGENTS routing in phases with explicit parity checks and no merge-order changes.

## Evidence Commands
- `MCP_RUNNER_TASK_ID=1004-codex-0110-version-policy-refresh-and-adoption-sequencing npx codex-orchestrator start docs-review --format json --no-interactive --task 1004-codex-0110-version-policy-refresh-and-adoption-sequencing`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md .agent/task/1004-codex-0110-version-policy-refresh-and-adoption-sequencing.md`

## Risks & Mitigations
- Risk: stale policy references create inconsistent operator decisions.
- Mitigation: use timestamped external/local audits and keep fact tagging explicit.
- Risk: premature default flip in absence of current canary evidence.
- Mitigation: hard gate default flips behind task `1005` canary decision.
- Risk: AGENTS router simplification changes behavior by accident.
- Mitigation: phase `1008` work and preserve merge-order semantics as invariant.
- Risk: scope creep into governance/runtime implementation.
- Mitigation: explicit non-goals for plugin governance and runtime edits in `1004`.
