# Task Checklist - linear-7896d3c1-7a62-4b79-97df-a71984fab5b2

- Linear Issue: `CO-225` / `7896d3c1-7a62-4b79-97df-a71984fab5b2`
- MCP Task ID: `linear-7896d3c1-7a62-4b79-97df-a71984fab5b2`
- Primary PRD: `docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- TECH_SPEC: `tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- Shared source 0 anchor: `ctx:sha256:55b1fe17233f9cfdd4784c7f69c01c4db4680de408150700c8ab551971417abc#chunk:c000001`
- Current origin manifest: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-docs-packet/cli/2026-04-17T20-05-40-785Z-50e95ea9/manifest.json`

## Docs-First
- [x] PRD drafted for false runtime synthesis of `Guardrails: spec-guard command not found.` when no `spec-guard` stage exists, with explicit manifest summaries, metrics closeout, provider issue observability, and retry truth scope. Evidence: `docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`.
- [x] TECH_SPEC drafted with the protected terms, shared applicability contract, explicit non-goals, and parent-owned implementation seams. Evidence: `tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`, `docs/TECH_SPEC-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`.
- [x] `tasks/index.json` and `docs/TASKS.md` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`. Evidence: `.agent/task/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Runs with no `spec-guard` stage stop synthesizing `Guardrails: spec-guard command not found.` in manifest summaries.
- [ ] Metrics closeout stops preserving or appending the fake missing-guardrail summary for non-applicable runs.
- [ ] Provider issue observability stops treating the fake missing-guardrail summary as current failure truth.
- [ ] Retry truth stops treating the fake missing-guardrail summary as real guardrail failure.
- [ ] Real `spec-guard` succeeded, failed, skipped, and pending outcomes remain explicit when a stage exists.
- [ ] The final fix stays bounded to false synthesis / applicability truth rather than generic guardrail redesign, unrelated scheduler/provider changes, or docs-only reinterpretation.

## Validation
- [x] Child scoped JSON parse check. Evidence: `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "Guardrails: spec-guard command not found\\.|no spec-guard stage exists|manifest summaries|metrics closeout|provider issue observability|retry truth|docs-only reinterpretation|generic guardrail redesign" docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/TECH_SPEC-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/tasks-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md .agent/task/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/TECH_SPEC-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/tasks-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md .agent/task/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/index.json docs/TASKS.md`.
- [ ] Parent focused guardrail-status and metrics-closeout regressions.
- [ ] Parent focused provider issue observability and retry-truth regressions.
- [ ] Parent docs-review before implementation.
- [ ] Parent-selected scoped validation after source edits.

## Progress Log
- 2026-04-18: bounded same-issue child lane created the `CO-225` docs-first packet and registry mirrors against source anchor `ctx:sha256:55b1fe17233f9cfdd4784c7f69c01c4db4680de408150700c8ab551971417abc#chunk:c000001`. The expected shared source payload was absent in this child checkout, so the packet is anchored on the protected handoff wording only: `Guardrails: spec-guard command not found.`, `no spec-guard stage exists`, `manifest summaries`, `metrics closeout`, `provider issue observability`, `retry truth`, and the rejection of generic guardrail redesign, unrelated scheduler/provider changes, and docs-only reinterpretation.
