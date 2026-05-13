---
id: 20260330-linear-97aef5e3-dadb-4909-9b00-68c698f10f93
title: CO Make Linear Child-Stream JSON Parsing Robust to Wrapper Prelude Logs
relates_to: docs/PRD-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`
- PRD: `docs/PRD-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`
- Task checklist: `tasks/tasks-linear-97aef5e3-dadb-4909-9b00-68c698f10f93.md`

## Traceability
- Linear issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Linear URL: https://linear.app/asabeko/issue/CO-37/co-make-linear-child-stream-json-parsing-robust-to-wrapper-prelude

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make provider-worker `linear child-stream --format json` tolerate leading wrapper log lines before the final JSON object while preserving fail-closed behavior and the existing success payload contract.
- Scope:
  - docs-first registration and baseline audit for the current Linear worker issue
  - bounded parse changes in `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - focused regressions in `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - no broader provider-worker workflow or lineage changes
- Constraints:
  - preserve current child-run path confinement checks
  - preserve current success payload shape once parsing succeeds
  - reject malformed or missing final JSON instead of guessing

## Technical Requirements
- Functional requirements:
  - valid final JSON objects must parse successfully even when stdout contains leading informational log lines
  - malformed or missing final JSON must still return `provider_worker_child_stream_output_invalid`
  - successful parse output must preserve the existing `ProviderLinearChildRunResult` contract and field names
  - unsafe `run_id`, artifact-root, manifest, or log paths must remain rejected exactly as before
- Non-functional requirements (performance, reliability, security):
  - keep the patch narrow to the child-stream parsing seam
  - avoid introducing false positives from arbitrary log text
  - keep the parser deterministic and easy to audit in tests
- Interfaces / contracts:
  - launcher shell: `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - focused tests: `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - reference extraction behavior: `orchestrator/src/cli/delegationServer.ts`

## Architecture & Data
- Architecture / design adjustments:
  - extract the trailing JSON object from stdout after optional prelude logs
  - keep downstream normalization and path validation unchanged after JSON parsing succeeds
  - fail closed when no valid final object can be parsed from the child stdout
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - existing child-stream `codex-orchestrator start ... --format json` output contract
  - existing provider-worker manifest/path validation helpers

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused regressions in `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - required repo validation floor after implementation
- Rollout verification:
  - confirm a prelude-log stdout sample now succeeds
  - confirm malformed trailing JSON still fails
  - confirm success payload fields remain unchanged
- Monitoring / alerts:
  - use the Linear workpad for operator-visible progress
  - use focused tests plus provider-worker review evidence as the main proof surface

## Open Questions
- Whether the child-stream shell should reuse a shared JSON-extraction helper or carry a local bounded extractor. Prefer the smallest option that avoids widening scope.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json`
- Date: 2026-03-30

## Manifest Evidence
- Baseline audit: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T064305Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json`
- Docs-review override note: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T065459Z-docs-review-override.md`
