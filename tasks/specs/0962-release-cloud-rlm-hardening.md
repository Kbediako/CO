---
id: 20260214-0962-release-cloud-rlm-hardening
title: Release + Cloud + RLM Hardening
relates_to: docs/PRD-release-cloud-rlm-hardening.md
risk: medium
owners:
  - Codex
last_review: 2026-02-14
---

## Summary
- Objective: Implement approved high-impact reliability and ergonomics improvements across release workflows, cloud canary CI, symbolic runtime behavior, and docs/process guidance.
- Scope: workflow/script/runtime/tests/docs updates tied directly to approved backlog.
- Constraints: no broad rewrites, keep behavior stable for downstream npm users.

## Technical Requirements
- Functional requirements:
  - Canonicalize release tag resolution and validate manual dispatch contexts.
  - Enforce signed tag presence and reject lightweight tags before release artifacts are built/published.
  - Ensure prerelease tags map to non-`latest` npm dist-tags.
  - Add cloud branch preflight checks and fail-fast CLI setup behavior in canary CI.
  - Add env-gated deliberation artifact logging in symbolic loop runtime.
  - Replace `console.*` in `rlmRunner` with shared logger usage.
  - Expand symbolic tests covering output variable carry-forward and deliberation logging behavior.
  - Add exactly two docs ergonomics deliverables:
    - a micro-task path policy section
    - downstream skills release/install guidance
- Non-functional requirements (performance, reliability, security):
  - Maintain deterministic CI failures with actionable messaging.
  - Maintain symbolic planning budget constraints.
  - Avoid introducing insecure secret handling patterns.
- Interfaces / contracts:
  - `RLM_SYMBOLIC_DELIBERATION_LOG` controls deliberation prompt/output/meta artifact persistence.
  - Release workflow emits normalized `tag` metadata consumed by build and publish jobs.
  - Release workflow signer verification requires one repo secret: `RELEASE_SIGNING_PUBLIC_KEYS` (GPG) or `RELEASE_SIGNING_ALLOWED_SIGNERS` (SSH).

## Architecture and Data
- Architecture / design adjustments:
  - Workflow metadata normalization and validation as a first-class release step.
  - Cloud canary preflight branch existence check in script layer.
  - Optional deliberation artifact persistence path in symbolic runtime.
- Data model changes / migrations:
  - No external migrations; optional omission of deliberation artifact paths when logging disabled.
- External dependencies / integrations:
  - GitHub Actions + npm registry publish path.

## Validation Plan
- Tests / checks:
  - Full guardrail lane from AGENTS.
  - Focused symbolic test assertions for deliberation logging + output var/final var behavior.
- Rollout verification:
  - Confirm PR CI checks pass and release workflow compatibility remains intact.
- Monitoring / alerts:
  - Track release run and cloud canary run summaries/manifests.

## Open Questions
- None blocking.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
