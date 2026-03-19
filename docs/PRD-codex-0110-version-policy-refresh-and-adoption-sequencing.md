# PRD - Codex 0.110 Version Policy Refresh + Adoption Sequencing (1004)

## Summary
- Problem Statement: CO policy guidance still references the previous stable/prerelease baseline while completed 2026-03-05 audits show `0.110.0` stable and `0.111.0-alpha.1` prerelease.
- Desired Outcome: complete a docs-first planning slice that (1) records confirmed vs inferred audit facts, (2) defines adoption sequencing for tasks `1004` through `1008`, and (3) locks explicit non-goals/risk controls before any default-flip decision work.
- Scope Status: docs-first planning slice complete on 2026-03-05 with docs-review + docs guards evidence; no runtime code edits.

## User Request Translation
- User intent: create task `1004-codex-0110-version-policy-refresh-and-adoption-sequencing` and deliver full docs-first planning artifacts with updated task registries and evidence-backed sequencing.
- Required outcomes:
  - audit facts captured with explicit `confirmed` vs `inferred` markers,
  - sequencing defined: `1004` policy/docs refresh, `1005` canary matrix + decision, `1006` parser/wrapper hardening (conditional), `1007` audit refresh, `1008` AGENTS router simplification (phased, no merge-order changes),
  - explicit non-goals/risk controls recorded,
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated,
  - docs-review manifest captured,
  - docs checks passed (`spec-guard`, `docs:check`, `docs:freshness`),
  - mirror parity + short docs-first summary note captured with evidence paths.

## Goals
- Convert completed external/local audits into auditable planning inputs for the 0.110 policy refresh lane.
- Establish deterministic slice ordering and dependency edges across `1004-1008`.
- Preserve safety posture by making canary evidence a hard prerequisite for default flips.

## Non-Goals
- No runtime implementation/code changes in task 1004.
- No plugin governance policy redesign in task 1004 (explicitly deferred).
- No default version flip decision in task 1004.

## Sequencing Contract (Docs-First)
1. `1004` - policy/docs refresh planning and evidence normalization (this slice).
2. `1005` - stable/prerelease canary matrix + explicit go/hold decision record.
3. `1006` - parser/wrapper hardening only if `1005` surfaces parsing/compat regressions.
4. `1007` - audit refresh to confirm post-change state and close drift.
5. `1008` - AGENTS router simplification in phases, preserving existing merge-order semantics.

## Risk Controls
- Hard gate: no default flip without canary evidence (`1005`).
- Hard gate: parser/wrapper hardening remains conditional scope (`1006`).
- Hard gate: AGENTS router simplification must not change merge-order behavior (`1008`).
- Explicit defer: plugin governance remains out of scope in this sequencing set.

## Acceptance Criteria
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklists and findings docs exist for `1004` and are internally consistent.
2. `confirmed` vs `inferred` fact tagging is explicit in findings artifacts.
3. Slice ordering and conditional boundaries (`1004-1008`) are explicit across PRD/spec/checklist.
4. Registry snapshots (`tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`) include `1004` references.
5. Docs-review and requested docs checks are captured with terminal evidence and parity logs.
