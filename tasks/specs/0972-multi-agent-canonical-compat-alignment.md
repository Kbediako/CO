---
id: 20260218-0972-multi-agent-canonical-compat-alignment
title: Multi-Agent Canonical Terminology + Compatibility Alignment
relates_to: tasks/tasks-0972-multi-agent-canonical-compat-alignment.md
risk: medium
owners:
  - Codex
last_review: 2026-02-18
---

## Summary
- Objective: align CO guidance and user-facing messaging to canonical `multi_agent` feature gating while preserving stable legacy `collab` compatibility surfaces.
- Scope: docs/help/skill wording hardening, compatibility policy codification, and targeted validation.
- Constraints: no breaking schema/interface renames in this phase.

## Technical Requirements
- Functional requirements:
  - Feature-gating guidance must prefer `multi_agent` everywhere user enablement is described.
  - Legacy naming that is part of stable contracts remains documented as compatibility alias.
  - Existing runtime feature detection must continue to prefer canonical key and fallback to legacy key.
  - Add additive canonical alias support for RLM CLI/env toggles:
    - `--multi-agent` (preferred) as an alias for `--collab`.
    - `RLM_SYMBOLIC_MULTI_AGENT` (preferred) with fallback to `RLM_SYMBOLIC_COLLAB`.
    - `RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY` (preferred) with fallback to `RLM_COLLAB_ROLE_POLICY`.
    - `RLM_SYMBOLIC_MULTI_AGENT_ALLOW_DEFAULT_ROLE` (preferred) with fallback to `RLM_COLLAB_ALLOW_DEFAULT_ROLE`.
  - Emit non-blocking migration warnings when legacy-only toggles are used.
- Non-functional requirements:
  - Keep changes minimal and reviewable.
  - Avoid introducing migration friction for downstream users.
- Interfaces / contracts:
  - Preserve `--collab` CLI compatibility.
  - Preserve `RLM_SYMBOLIC_COLLAB` and `manifest.collab_tool_calls` naming in this phase.

## Validation Plan
- Tests / checks:
  - `npm run test -- orchestrator/tests/Doctor.test.ts orchestrator/tests/DoctorUsage.test.ts orchestrator/tests/RlmRunnerMode.test.ts tests/cli-command-surface.spec.ts`
  - `npm run docs:check`
  - `npm run lint`
  - `npm run build`
- Regression checks:
  - Canonical-first + legacy-fallback doctor behavior remains intact.
  - Docs/skills consistently describe canonical feature key.
  - Manual checks verify canonical and legacy CLI toggles both operate as expected.

## Phase-3 Direction (resolved)
- If upstream drops `collab` aliases, CO still accepts `--collab` and `RLM_SYMBOLIC_COLLAB` as local compatibility aliases mapped to canonical controls during a migration window.
- Legacy alias warnings remain non-blocking during that migration window.
- Removal of local aliases requires a dedicated follow-up task, explicit release-note migration guidance, and downstream smoke validation.
- `manifest.collab_tool_calls` remains unchanged until a schema-versioned migration is approved.

## Approvals
- Reviewer: user
- Date: 2026-02-18
