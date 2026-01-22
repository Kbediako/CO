---
name: delegate-early
description: Spawn subagents early and often to conserve context and parallelize research, review, and planning.
---

# Delegate Early

Use this skill when a task can be split into parallel streams or when the main context risks ballooning. The top-level Codex remains the lead; subagents are assistants.

## Goals
- Conserve primary context by offloading research/review/planning.
- Improve throughput with parallel subagent streams.
- Capture delegation evidence for auditability.

## When to spawn
- Before deep reading/analysis to avoid bloating context.
- When new ambiguity appears or scope changes.
- For independent streams (research, review, planning, edge cases).

## Task slicing heuristic
- Identify 2–4 independent streams with minimal shared context.
- Prefer streams like: `research`, `review`, `spec-check`, `edge-cases`.

## Required conventions
- Use `MCP_RUNNER_TASK_ID=<task-id>-<stream>` for subagents.
- Record manifest paths and summarize findings in the main run.

## Minimal delegation workflow
1) Name streams and write 1–2 sentence goals for each.
2) Spawn subagents with clear, bounded prompts.
3) Wait for results; summarize and merge into the main plan.
4) Proceed with implementation.

## Prompt patterns
- Research: “Find X, cite Y, return 3 bullets + risks.”
- Review: “Inspect files A/B for regressions; list issues by severity.”
- Planning: “Draft a 3–5 step plan, call out unknowns.”

## Escalation rules
- If delegation is impossible, set override reason and document it in the task checklist.

## Subagent summary format
- Findings
- Risks
- Open questions
- Evidence (manifest path)
