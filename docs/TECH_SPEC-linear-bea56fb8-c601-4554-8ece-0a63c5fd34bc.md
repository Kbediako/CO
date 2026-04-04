---
id: 20260404-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc
title: CO STATUS: restore truthful default operator telemetry and Symphony parity
relates_to: docs/PRD-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md
risk: high
owners:
  - Codex
last_review: 2026-04-04
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`
- PRD: `docs/PRD-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`
- Task checklist: `tasks/tasks-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md`

## Traceability
- Linear issue: `CO-78` / `bea56fb8-c601-4554-8ece-0a63c5fd34bc`
- Linear URL: https://linear.app/asabeko/issue/CO-78/co-status-restore-truthful-default-operator-telemetry-and-symphony

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore a truthful default non-JSON `CO STATUS` operator surface that matches the issue contract and reaches Symphony parity where Symphony provides more operator-useful semantics.
- Scope:
  - remove default dashboard auto-start and default `Dashboard:` advertisement
  - restore truthful header telemetry and row telemetry
  - make rate-limit presentation Codex-first and operator-useful
  - add PID and meaningful event semantics
  - re-test the full visible status contract and capture real-device screenshot proof
- Constraints:
  - preserve bounded control-host architecture
  - no dashboard UI redesign
  - no synthetic screenshot proof

## Technical Requirements
- Functional requirements:
  - default non-JSON `co-status` must not auto-run or advertise the dashboard unless explicitly requested
  - `Tokens` and `Throughput` must show truthful live values or explicit `n/a`
  - `Rate Limits` must prefer Codex limits and render cleaned Linear budget semantics
  - rows must expose `PID`, meaningful `EVENT`, truthful `AGE / TURN`, truthful `TOKENS`, and truthful `SESSION`
  - every visible field and required state must be covered by tests or explicit manual proof
- Non-functional requirements (performance, reliability, security):
  - keep the status surface read-only
  - treat unavailable telemetry explicitly instead of fabricating values
  - keep reset-time formatting deterministic and trustworthy
- Interfaces / contracts:
  - terminal renderer: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - related status read-model / presenter helpers on the same visible truth path
  - regression coverage: `orchestrator/tests/ControlStatusDashboard.test.ts` and adjacent shared-status tests as needed
  - Symphony reference: `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`

## Architecture & Data
- Architecture / design adjustments:
  - keep one visible status truth path and fix the missing or misleading data at the smallest shared seam
  - make dashboard URL rendering conditional on authoritative dashboard enablement
  - add bounded row/schema expansion for PID and improved event semantics
- Data model changes / migrations:
  - no persistence or migration changes expected
  - likely read-model or presenter-field propagation updates for token/session/turn telemetry
- External dependencies / integrations:
  - local live control-host/read-model state
  - Symphony status semantics used as a local reference only

## Parity / Alignment Matrix
- Current truth:
  - dashboard auto-start and advertisement still affect the default path
  - rate limits and row semantics underperform the Symphony reference
  - some live telemetry is missing or misleading
- Reference truth:
  - Symphony provides conditional dashboard rendering, PID, humanized events, and explicit unavailable semantics
- Target truth / intended delta:
  - default CO STATUS becomes terminal-first, Codex-first, and explicit about unavailable data while matching Symphony’s operator-useful semantics where appropriate
- Explicitly out-of-scope differences:
  - dashboard redesign and unrelated control-host cleanup

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused status/dashboard regressions for launch behavior, telemetry, rate limits, row semantics, and degraded states
  - full repo validation floor
- Rollout verification:
  - live real-device screenshots embedded directly in Linear
  - active, paused, compact, idle, and degraded states covered
- Monitoring / alerts:
  - no new runtime monitoring; rely on focused regression coverage and proof artifacts

## Open Questions
- Which current CO helper owns the authoritative live token/session/turn telemetry that the status frame should project?
- Are there any downstream `co-status` consumers relying on the current default dashboard side effect that must stay opt-in instead of disappearing entirely?

## Approvals
- Reviewer: `codex-orchestrator docs-review` approved with `review_outcome: clean-success`
- Date: 2026-04-04
- Manifest: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`
