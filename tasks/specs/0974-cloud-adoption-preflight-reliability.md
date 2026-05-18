---
id: 20260218-0974-cloud-adoption-preflight-reliability
title: Cloud + RLM Adoption Reliability + Fallback Contract Hardening
status: done
relates_to: tasks/tasks-0974-cloud-adoption-preflight-reliability.md
risk: medium
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (16 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Summary
- Objective: deliver the approved cloud/RLM adoption hardening items (doctor preflight path + adoption hints, safe MCP enablement, resilience tuning knobs, canary fallback-contract checks).
- Scope: CLI doctor cloud preflight and usage-hint surfaces, MCP enable helper, cloud executor retry-tuning knobs, CI canary contract assertions, and docs/tests updates.
- Constraints: additive changes only; preserve existing cloud->mcp fallback behavior and non-cloud repo usability.

## Technical Requirements
- Functional requirements:
  - Add a first-class `doctor` cloud preflight path with both text and JSON output support.
  - Surface deterministic preflight issues from existing cloud preflight checks without duplicating logic.
  - Add low-friction `mcp enable` command for disabled MCP servers with guardrails for unsupported fields and secret-redacted display output.
  - Add adoption hints for low cloud/RLM usage in `doctor --usage`.
  - Introduce bounded environment knobs for cloud status retry behavior:
    - `CODEX_CLOUD_STATUS_RETRY_LIMIT`
    - `CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS`
  - Extend cloud canary to support explicit fallback-contract assertion mode and validate:
    - `manifest.cloud_fallback` presence and required fields
    - run-summary fallback projection consistency
- Non-functional requirements:
  - Keep implementation minimal and backward-compatible.
  - Maintain non-interactive CI behavior.
- Interfaces / contracts:
  - Preserve existing manifest schema fields (`cloud_execution`, `cloud_fallback`).
  - Preserve existing cloud canary success-contract assertions.

## Validation Plan
- Tests / checks:
  - `npm run test -- orchestrator/tests/Doctor.test.ts orchestrator/tests/DoctorUsage.test.ts orchestrator/tests/McpEnable.test.ts orchestrator/tests/CodexCloudTaskExecutor.test.ts orchestrator/tests/CloudModeAdapters.test.ts`
  - `npm run test -- tests/cli-command-surface.spec.ts`
  - `npm run docs:check`
  - `npm run lint`
  - `npm run build`
- Regression checks:
  - Existing cloud preflight fallback still routes to `mcp` with manifest summary.
  - Cloud canary success mode and fallback mode both produce deterministic assertions.
- Manual verification:
  - `codex-orchestrator doctor --cloud-preflight`
  - `codex-orchestrator doctor --cloud-preflight --format json`
  - `codex-orchestrator mcp enable --format json`
  - `codex-orchestrator doctor --usage --format json`
  - Local script smoke for `scripts/cloud-canary-ci.mjs` fallback mode.

## Review Notes
- 2026-04-21: CO-278 spec-guard freshness review re-read the cloud/RLM reliability contract, fallback constraints, and validation evidence; no scope reclassification or archive action is warranted, so this refresh is limited to the stale review baseline blocking enforced `node scripts/spec-guard.mjs`.

## Approvals
- Reviewer: user
- Date: 2026-02-18
- Standalone pre-implementation review: approved (`out/0974-cloud-adoption-preflight-reliability/manual/pre-implementation-standalone-review.log`)
- Docs-review manifest: `.runs/0974-cloud-adoption-preflight-reliability/cli/2026-02-18T10-37-33-980Z-72b397bb/manifest.json`
- Delegation scout manifest: `.runs/0974-cloud-adoption-preflight-reliability-scout/cli/2026-02-18T10-34-24-363Z-10dbacbb/manifest.json`
- Validation evidence: `.runs/0974-cloud-adoption-preflight-reliability-fallback-canary-postfix/cli/2026-02-18T12-48-42-597Z-1981cfb3/manifest.json`, `out/0974-cloud-adoption-preflight-reliability/manual/manual-cloud-canary-fallback.log`, `out/0974-cloud-adoption-preflight-reliability/manual/manual-doctor-cloud-preflight.json`
