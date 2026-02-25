---
id: 20260225-0978-agent-first-adoption-steering-skill
title: Agent-First Adoption Steering Skill
relates_to: tasks/tasks-0978-agent-first-adoption-steering-skill.md
risk: medium
owners:
  - Codex
last_review: 2026-02-25
---

## Summary
- Objective: define and ship a bundled skill that nudges advanced CO capability usage without reducing agent autonomy.
- Scope: new skill under `skills/`, docs/task registry updates, and review evidence.
- Constraints: guidance-only and non-coercive; runtime behavior unchanged in this slice.

## Decision and Success Criteria
- Decision:
  - Use hybrid control semantics for steering guidance:
    1) event/milestone gate first;
    2) run-count cooldown next;
    3) time-based safety cap as fallback.
  - Keep recommendations optional and ignore-safe.
- Success criteria:
  - Skill clearly documents when to suggest cloud/RLM/collab/delegation-first flows.
  - Skill explicitly prohibits mandatory language and mandatory workflow switching.
  - Skill includes high-throughput-safe anti-spam controls and low-volume fallback behavior.

## Technical Requirements
- Functional requirements:
  - Create skills/agent-first-adoption-steering/SKILL.md with:
    - autonomy-first principles and MCP-first baseline.
    - hybrid gating policy (event + run + time cap).
    - recommendation wording policy (optional, non-blocking, one action at a time).
    - cloud hint policy for repos without `cloudEnvId` (limited setup-only, rate limited).
    - low-volume fallback profile.
  - Update bundled skills listing in `README.md` to include the new skill.
  - Register docs-first artifacts in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Non-functional requirements:
  - ASCII-only docs.
  - No breaking CLI/schema changes.
  - Keep guidance concise and downstream-portable.
- Interfaces / contracts:
  - Skill front matter must follow existing bundled skill conventions (`name`, `description`).
  - Guidance must remain advisory and non-enforcing.

## Architecture & Data
- Architecture / design adjustments:
  - Add one new bundled skill directory.
  - Add documentation registry/index records for the new task.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - None.

## Policy Detail (Agent-First)
- Recommended control model:
  - Event-first eligibility by hint family (`cloud`, `rlm`, `guardrail-flow`).
  - Repeat gating requires both run and time thresholds (hybrid), for example:
    - same-hint cooldown: >=30 successful eligible runs and >=24h.
  - Dismissal suppression:
    - default: 120 successful eligible runs or 30d.
    - repeated dismissals: 240 runs or 60d.
- Cloud guidance policy:
  - If repo has no cloud wiring signal, allow setup-only hint at low frequency.
  - If preflight recently passed, cloud-stage suggestion can be shown as optional.
  - Any preflight/fallback failure resets cloud confidence state.
- Autonomy language contract:
  - Must include optional framing and ignore-safe behavior.
  - Must not include imperative/coercive wording (`must`, `required now`).

## Validation Plan
- Tailored standalone review:
  - Focus: correctness of policy framing, autonomy preservation, downstream portability.
- Tailored elegance review:
  - Focus: minimality, unnecessary complexity/verbosity removal, and policy coherence.
- Evidence capture:
  - Save review outputs under `out/0978-agent-first-adoption-steering-skill/manual/`.

## Open Questions
- None blocking.

## Approvals
- Pre-implementation standalone review: approved (no blocking issues).
- Standalone review evidence: `out/0978-agent-first-adoption-steering-skill/manual/pre-implementation-standalone-review.log`.
- Reviewer: user
- Date: 2026-02-25
