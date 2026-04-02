---
id: 20260402-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5
title: CO: Deduplicate trailing JSON-tail parsing across child-stream and delegation server
relates_to: docs/PRD-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md
risk: high
owners:
  - Codex
last_review: 2026-04-03
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`
- PRD: `docs/PRD-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`
- Task checklist: `tasks/tasks-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`

## Traceability
- Linear issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`
- Linear URL: https://linear.app/asabeko/issue/CO-50/co-deduplicate-trailing-json-tail-parsing-across-child-stream-and
- Source issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Source PR: `#325`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: move the shared trailing JSON-tail parse contract into one helper reused by provider-worker child-stream parsing and delegation-server spawn-output parsing.
- Scope:
  - docs-first packet registration for `CO-50`
  - one shared helper extraction for trailing JSON object parsing
  - both call sites updated to use the helper while preserving their return contracts
  - focused seam regression coverage plus required validation and review gates
- Constraints:
  - preserve object-only parsing, trailing `}` guard, full-string parse first, then suffix scan for the final JSON object
  - keep provider-worker child-run normalization and delegation-server spawn contract unchanged
  - avoid unrelated provider-worker or delegation-server behavior changes

## Technical Requirements
- Functional requirements:
  - the shared helper must accept raw stdout and return either a parsed object or `null`
  - the helper must preserve the strict trailing-tail parse contract for the provider-worker child-stream seam
  - provider-worker child-stream parsing must reuse the helper and continue returning `null` on parse failure
  - delegation-server spawn parsing must reuse the helper and continue returning `{}` on parse failure
  - delegation-server spawn parsing must continue tolerating footer log lines that appear after a valid JSON object in stdout
  - focused tests must prove prelude-log success and malformed-output failure at both seams, plus delegation-server footer-log success
- Non-functional requirements:
  - fail closed for malformed, truncated, empty, or non-object payloads
  - keep the helper small, local, and auditable
  - do not widen into general output parsing abstractions or unrelated refactors
- Interfaces / contracts:
  - helper location: shared CLI utility module
  - provider seam: `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - delegation seam: `orchestrator/src/cli/delegationServer.ts`
  - tests: `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`, `orchestrator/tests/DelegationServer.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - move the existing provider-worker helper into a shared utility module
  - keep call-site wrappers thin so each surface still exposes its existing parse-failure shape
  - keep the shared helper caller-configurable so delegation-server can preserve its existing footer-log tolerance without widening the provider-worker seam
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - none beyond the two existing CLI seams

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused seam tests for provider-worker child-stream and delegation-server spawn parsing
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review
- Rollout verification:
  - confirm both call sites import the shared helper
  - confirm malformed-output cases still fail closed with unchanged outer contracts
- Monitoring / alerts:
  - no new runtime monitoring; rely on existing test and review coverage

## Open Questions
- Resolved on 2026-04-03: delegated spawn consumers do rely on parsing a valid JSON object before trailing footer logs. The shared helper must therefore preserve delegation-server footer-log tolerance while keeping the stricter provider-worker seam unchanged.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-02
