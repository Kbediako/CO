---
name: agent-first-adoption-steering
description: "Agent-first Codex Orchestrator usage playbook for downstream users: docs-first execution, delegation-first operations, non-coercive capability steering, and autonomy-preserving review guidance."
---

# Agent-First Orchestrator Playbook

## Overview

Use this skill as a general operating playbook for Codex Orchestrator, not only advanced feature nudges. It should help agents choose the best command path, preserve autonomy, and keep evidence quality high for both this repo and downstream npm-only users.

## Core Contract

- Keep MCP as the default control plane.
- Keep the top-level agent as decision-maker; subagents support with bounded evidence streams.
- Use guidance as non-blocking recommendations unless the operator explicitly enables enforcement.
- Prefer minimal steps that preserve momentum and reviewability.

## Baseline Workflow (All Tasks)

1. Docs-first before implementation edits:
- Create or refresh PRD + TECH_SPEC + ACTION_PLAN + task checklist.
- Register/update task mirrors and freshness metadata.

2. Gate before editing runtime code:
- Run `docs-review` first and capture manifest evidence.

3. Agent-first execution:
- Delegate at least one bounded stream for research/review/planning.
- Keep ownership clear; summarize subagent evidence in main run notes.

4. Validation and handoff:
- Run relevant checks/tests for the scope.
- Capture standalone + elegance review evidence when scope is non-trivial.

## Capability Steering (Advanced Features)

Use a hybrid control model for nudges:
- Event/milestone gate first.
- Run-count cooldown second.
- Time-based safety caps third.

Avoid run-only controls by themselves.
Avoid time-only controls by themselves.

Default steering style:
- One hint at a time.
- High-signal trigger reason.
- One concrete command.
- Explicitly safe-to-ignore wording.

Preferred wording:
- `Optional hint (non-blocking): ...`
- `If useful for this repo, ...`
- `Safe to ignore; local MCP remains valid.`

Avoid wording:
- `must`
- `required now`
- compliance/quota pressure language

## Review Guidance (Agent Autonomy First)

Default behavior should not clamp deep reviews:
- Bounded review guidance is advisory by default.
- Long/in-depth reviews are valid when the reviewing agent needs them.

Optional controls:
- Allow unrestricted heavy command execution: `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`
- Enforce bounded mode (hard-stop heavy command starts): `CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1`

Use enforcement only for explicit operator intent (for example CI budget control), not as a default policy.

## Downstream-NPM Packaging Contract

When writing guidance for users who only install npm package artifacts:
- Prefer `codex-orchestrator ...` command examples.
- Do not require repository-local wrapper scripts as the only documented path.
- Keep skill guidance self-contained so downstream users do not need this repo cloned for basic operation.

Preferred command surface:
- `codex-orchestrator flow --task <task-id>`
- `codex-orchestrator start docs-review --task <task-id> --format json`
- `codex-orchestrator start implementation-gate --task <task-id> --format json`
- `codex-orchestrator review --task <task-id>`
- `codex-orchestrator doctor --usage --task <task-id>`
- `codex-orchestrator rlm --multi-agent auto "<goal>"`

## Option Questions (Autonomy-Preserving Defaults)

When presenting options to users/agents:
- Put the recommended option first with one-sentence tradeoff.
- Avoid options that force a specific agent/model unless explicitly requested.
- Prefer options that preserve reversibility and local fallback.

## Open-Question Resolution Heuristic

For run-vs-time decisions:
- Start from events (state change or milestone reached).
- Use run-count as the primary anti-noise control in active repos.
- Keep time windows as a safety backstop for low-volume repos.

If uncertain, bias toward fewer hints and higher signal.

## Guardrails

- No blocking behavior unless explicitly enabled by operator controls.
- No JSON/JSONL contract contamination in machine-readable modes.
- No recommendation when readiness signals are missing or contradictory.
- Keep suggestions minimal, reversible, and auditable via manifests.

## Related skills
- `docs-first`: baseline task/spec scaffolding before implementation guidance.
- `delegation-usage`: delegation control-plane defaults and MCP setup.
- `collab-deliberation`: structured option analysis before steering decisions.
- `long-poll-wait`: patience-first monitoring for long-running cloud/RLM/review operations.
