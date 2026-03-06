# Findings - 1008 Transport/Channel Readiness Deliberation

- Date: 2026-03-05
- Task: `1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness`
- Scope: determine staged setup readiness and runbook prerequisites for Telegram, Linear advisory path, and Discord.

## Decision Summary

| Surface | Decision | Rationale |
| --- | --- | --- |
| Telegram | Start now (staged setup + canary) | Control-plane gates and authority boundaries are already formalized; immediate value with bounded rollout and rollback-first discipline. |
| Linear advisory path | Start now (non-authoritative) | Existing advisory-only tracker dispatch contract and no-mutation evidence support safe setup without authority expansion. |
| Discord | Defer | Use Telegram evidence closure as prerequisite to reduce parallel blast radius and reuse runbook/canary patterns. |

## Evidence Base
- 0994 interactive-surface criteria and hold policy: `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`.
- 0996 promotion-readiness controls and explicit approval closure artifact linkage: `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`, `tasks/index.json`, `docs/TASKS.md`.
- 0997/0998 read-only transport/observability contracts: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `docs/PRD-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md`.
- 1000 advisory dispatch and no-mutation posture: `docs/PRD-coordinator-tracker-dispatch-pilot-non-authoritative.md`, `docs/TECH_SPEC-coordinator-tracker-dispatch-pilot-non-authoritative.md`, `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/manual-dispatch-results.json`.

## Prerequisites Still Needed for Real Setup
1. Telegram
- Operator runbook completion for credential lifecycle, ingress/webhook setup, canary execution, rollback, and incident handling.
- Manual simulation pack for auth/replay/idempotency edge cases and traceability checks.

2. Linear advisory path
- Operator runbook completion for source binding and advisory recommendation validation.
- No-mutation and malformed-source fail-closed simulation checks in setup context.

3. Discord (deferred)
- Telegram closure evidence accepted and stable.
- Reuse Telegram runbook skeleton with Discord-specific setup details before activation planning.

## Guardrail Callouts
- CO remains execution authority; Coordinator remains intake/control bridge.
- Mutating-control auth/token + idempotency constraints stay fail-closed.
- Linear setup is advisory-only and cannot become authoritative in this slice.
